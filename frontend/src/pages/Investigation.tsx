import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, ClipboardPlus, ExternalLink, FileDown, Landmark, MapPin, Network, ShieldAlert, WalletCards } from 'lucide-react'
import { api, formatDate, formatINR } from '../services/api'
import { DataSourceBadge, ErrorState, Notice, PageHeading, PageLoader, RiskBadge } from '../components/UI'
import { NetworkGraph } from '../components/NetworkGraph'

export default function Investigation() {
  const { projectId = '' } = useParams()
  const [project, setProject] = useState<any>()
  const [network, setNetwork] = useState<any>()
  const [error, setError] = useState('')
  const [modal, setModal] = useState(false)
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const load = () => {
    if (!projectId) return
    setError('')
    Promise.all([
      api.project(projectId),
      api.projectNetwork(projectId).catch(() => ({ nodes: [], edges: [], summary: {} }))
    ])
      .then(([p, n]) => {
        setProject(p)
        setNetwork(n)
      })
      .catch(e => setError(e.message))
  }

  useEffect(() => {
    load()
  }, [projectId])

  const createReview = async () => {
    setSaving(true)
    try {
      await api.createInvestigation({
        project_id: projectId,
        officer: 'Aditi Sharma',
        status: 'Under Review',
        remarks: remarks || 'Initial investigation opened by monitoring officer.'
      })
      setMessage('Investigation record created and audit trail updated.')
      setModal(false)
      setRemarks('')
      load()
    } catch (e: any) {
      setMessage(e.message)
    } finally {
      setSaving(false)
    }
  }

  const report = async () => {
    try {
      const r = await api.report(projectId)
      const reportWindow = window.open('', '_blank')
      if (!reportWindow) return
      reportWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${r.report_title} - ${projectId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 860px; margin: 40px auto; color: #1e293b; line-height: 1.5; padding: 0 20px; }
    h1 { color: #0b3957; border-bottom: 2px solid #0b3957; padding-bottom: 10px; font-size: 24px; margin: 0 0 6px 0; }
    h2 { margin-top: 24px; color: #155a8a; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
    td, th { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: left; }
    th { background: #f8fafc; color: #475569; }
    .box { background: #fef3c7; padding: 14px 18px; border-left: 4px solid #d97706; border-radius: 4px; color: #92400e; font-size: 13px; margin: 16px 0; }
  </style>
</head>
<body>
  <h1>${r.report_title}</h1>
  <p style="color:#64748b;font-size:12.5px;">Generated ${new Date(r.generated_at).toLocaleString('en-IN')} · Ref: <b>${projectId}</b></p>
  <div class="box">${r.disclaimer}</div>
  <h2>Project Details</h2>
  <table>
    ${Object.entries(r.project)
      .filter(([k]) => !['payments', 'anomalies', 'investigations'].includes(k))
      .map(([k, v]) => `<tr><th>${k.replace(/_/g, ' ').toUpperCase()}</th><td>${typeof v === 'number' && k.includes('amount') ? formatINR(v as number) : String(v ?? '—')}</td></tr>`)
      .join('')}
  </table>
  <h2>Risk Evaluation</h2>
  <p><b>Composite Score: ${r.risk.score}/100 — ${r.risk.level}</b></p>
  <p style="font-size:13px;color:#64748b;">${r.risk.method}</p>
  <h2>Detected Anomaly Signals</h2>
  <table>
    <thead><tr><th>Type</th><th>Severity</th><th>Evidence</th><th>Explanation</th></tr></thead>
    <tbody>
      ${(r.anomalies || []).map((a: any) => `<tr><td><b>${a.type}</b></td><td>${a.severity}</td><td>${a.measured} (expected: ${a.expected})</td><td>${a.explanation}</td></tr>`).join('')}
    </tbody>
  </table>
  <h2>Contractor Context</h2>
  <p style="font-size:13px;">${r.contractor?.name || 'Unassigned'}: ${r.contractor?.total_projects || 0} projects; ${formatINR(r.contractor?.total_value || 0)} portfolio value; ${r.contractor?.high_risk_projects || 0} high-risk projects.</p>
  <h2>Officer Remarks & Audit Trail</h2>
  <p style="font-size:13px;">${(r.investigations || []).map((x: any) => `<b>${x.officer}</b> (${x.status}): ${x.remarks || 'No remarks recorded.'}`).join('<br/>') || 'No officer remarks recorded.'}</p>
</body>
</html>`)
      reportWindow.document.close()
      reportWindow.focus()
      setTimeout(() => reportWindow.print(), 350)
    } catch (e: any) {
      setMessage(e.message)
    }
  }

  if (error) return <ErrorState message={error} retry={load} />
  if (!project) return <PageLoader label="Loading investigation evidence…" />

  const risk = project.risk_components || {
    rule_score: 0,
    ml_score: 0,
    statistical_score: 0,
    network_score: 0,
    final_risk_score: project.risk_score || 0,
    risk_level: project.risk_level || 'Low'
  }

  const financials = [
    { label: 'Recommended', value: project.recommended_amount || 0, color: '#b9cbd5' },
    { label: 'Sanctioned', value: project.sanctioned_amount || 0, color: '#155a8a' },
    { label: 'Released', value: project.released_amount || 0, color: '#2f8f83' },
    { label: 'Expenditure', value: project.expenditure || 0, color: '#c47c34' }
  ]
  const max = Math.max(1, ...financials.map(x => x.value))
  const anomalies = project.anomalies || []
  const payments = project.payments || []
  const investigations = project.investigations || []
  const riskLevelStr = (project.risk_level || 'Low').toLowerCase()

  return (
    <>
      <Link className="back-link" to="/projects">
        <ArrowLeft size={16} /> Back to project register
      </Link>
      <PageHeading
        eyebrow="PROJECT INVESTIGATION"
        title={project.project_id}
        description={`${project.project_type || 'Infrastructure'} · ${project.district || ''}, ${project.state || ''}`}
        action={
          <div className="heading-buttons">
            <button className="btn secondary" onClick={report}>
              <FileDown size={16} /> Generate report
            </button>
            <button className="btn primary" onClick={() => setModal(true)}>
              <ClipboardPlus size={16} /> Start review
            </button>
          </div>
        }
      />
      <Notice>
        This platform identifies anomalous patterns and prioritises projects for human review. An anomaly does not prove fraud or wrongdoing.
      </Notice>
      {message && (
        <div className="success-toast">
          <CheckCircle2 size={17} />
          {message}
        </div>
      )}
      <div className="investigation-top">
        <section className="panel risk-hero">
          <div className={`risk-orb ${riskLevelStr}`}>
            <strong>{project.risk_score ?? 0}</strong>
            <span>/100</span>
          </div>
          <div>
            <div className="eyebrow">COMPOSITE RISK SCORE</div>
            <h2>{project.risk_level || 'Low'} — verification recommended</h2>
            <p>
              Prototype methodology: 30% rules · 30% unsupervised ML · 20% statistical deviation · 20% network concentration.
            </p>
            <div className="component-bars">
              {[
                ['Rule engine', risk.rule_score ?? 0],
                ['Isolation Forest', risk.ml_score ?? 0],
                ['Statistical deviation', risk.statistical_score ?? 0],
                ['Network concentration', risk.network_score ?? 0]
              ].map(([label, score]: any) => (
                <div key={label}>
                  <span>{label}</span>
                  <div className="progress">
                    <i style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
                  </div>
                  <b>{Math.round(score)}</b>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="panel project-summary">
          <div className="panel-head">
            <div>
              <h2>Project snapshot</h2>
              <p>Recorded implementation information</p>
            </div>
            <RiskBadge level={project.risk_level || 'Low'} />
          </div>
          <dl>
            <div>
              <dt>Data origin</dt>
              <dd style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <DataSourceBadge source={project.data_source} />
                {project.source_url && (
                  <a
                    href={project.source_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '2px', color: 'var(--c-emerald)' }}
                    title="Open official MoSPI eSAKSHI dashboard"
                  >
                    MoSPI <ExternalLink size={12} />
                  </a>
                )}
              </dd>
            </div>
            {project.source_record_id && (
              <div>
                <dt>Source Record ID</dt>
                <dd>
                  <code>{project.source_record_id}</code>
                  <small style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.7rem', marginTop: '2px' }}>
                    {project.data_source === 'official' ? 'Prototype identifier conforming to MoSPI/eSAKSHI schema' : 'Synthetic demonstration identifier'}
                  </small>
                </dd>
              </div>
            )}
            <div>
              <dt>Status</dt>
              <dd>{project.status || 'Unknown'}</dd>
            </div>
            <div>
              <dt>Constituency</dt>
              <dd>{project.constituency_id || '—'}</dd>
            </div>
            <div>
              <dt>Implementing agency</dt>
              <dd>{project.implementing_agency || '—'}</dd>
            </div>
            <div>
              <dt>Contractor</dt>
              <dd>
                {project.contractor_id && !project.contractor_name?.includes('Unassigned') ? (
                  <Link to={`/contractors/${project.contractor_id}`}>
                    {project.contractor_name}
                  </Link>
                ) : (
                  <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    {project.data_source === 'official' ? 'Unassigned in Official Publication' : 'Unassigned'}
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>
                <MapPin size={14} />
                {project.location || '—'}
              </dd>
            </div>
            <div>
              <dt>Coordinates</dt>
              <dd>
                {project.latitude != null && project.longitude != null ? (
                  `${project.latitude.toFixed(4)}, ${project.longitude.toFixed(4)}`
                ) : (
                  <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    Not published in source export
                  </span>
                )}
              </dd>
            </div>
            {project.import_batch_id && (
              <div>
                <dt>Import batch</dt>
                <dd><small style={{ color: 'var(--text-secondary)' }}>{project.import_batch_id}</small></dd>
              </div>
            )}
          </dl>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>
              <ShieldAlert size={19} /> Why this project was flagged
            </h2>
            <p>Each alert is traceable to measured evidence and a comparison baseline.</p>
          </div>
        </div>
        <div className="evidence-list">
          {anomalies.length ? (
            anomalies.map((a: any, index: number) => (
              <article className="evidence-card" key={a.anomaly_id || index}>
                <div className={`evidence-number ${(a.severity || 'Medium').toLowerCase()}`}>
                  {index + 1}
                </div>
                <div className="evidence-main">
                  <div>
                    <h3>{a.anomaly_type}</h3>
                    <RiskBadge level={a.severity || 'Medium'} />
                  </div>
                  <p>{a.explanation}</p>
                  <div className="evidence-values">
                    <span>
                      <small>Measured</small>
                      <b>{a.measured_value || '—'}</b>
                    </span>
                    <span>
                      <small>Expected / reference</small>
                      <b>{a.expected_value || '—'}</b>
                    </span>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-panel">
              No explanatory anomaly evidence is available for this project.
            </div>
          )}
        </div>
      </section>

      <div className="investigation-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>
                <WalletCards size={19} /> Financial profile
              </h2>
              <p>Amounts and payment progression</p>
            </div>
            <span className="utilisation">{project.utilisation_percent ?? 0}% utilised</span>
          </div>
          <div className="financial-bars">
            {financials.map(x => (
              <div key={x.label}>
                <div>
                  <span>{x.label}</span>
                  <b>{formatINR(x.value)}</b>
                </div>
                <i style={{ width: `${Math.min(100, (x.value / max) * 100)}%`, background: x.color }} />
              </div>
            ))}
          </div>
          {project.status === 'Recommended' && (project.released_amount === 0 || !project.released_amount) && (
            <div style={{ marginTop: '14px', padding: '10px 14px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '10px', fontSize: '0.8rem', color: '#1e40af', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <b>Administrative Status Note:</b> This work is in the "Recommended" stage awaiting formal administrative sanction. Funds released and expenditure are legitimately ₹0 until sanction and tender award.
            </div>
          )}
          <div className="payment-list">
            <h3>Payment timeline</h3>
            {payments.length ? (
              payments.map((x: any) => (
                <div className="payment-row" key={x.payment_id}>
                  <span className="payment-date">{formatDate(x.payment_date)}</span>
                  <span>{x.payment_type}</span>
                  <span>{x.recipient}</span>
                  <b>{formatINR(x.amount || 0)}</b>
                </div>
              ))
            ) : (
              <div className="empty-panel">No payment records logged.</div>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>
                <Landmark size={19} /> Project timeline
              </h2>
              <p>Recorded decision and implementation dates</p>
            </div>
          </div>
          <div className="timeline">
            {[
              ['Recommendation', project.recommendation_date],
              ['Sanction', project.sanction_date],
              ['Start', project.start_date],
              ['Completion', project.completion_date]
            ].map(([label, value], i) => (
              <div className="timeline-item" key={String(label)}>
                <span className={i === 3 ? 'warning' : ''} />
                <div>
                  <small>{label}</small>
                  <b>{formatDate(String(value || ''))}</b>
                </div>
              </div>
            ))}
          </div>
          <div className="timeline-note">
            Validate dates against supporting files where timing signals are unusual.
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>
              <Network size={19} /> Contractor, project and agency network
            </h2>
            <p>Relationship view supports concentration review; it does not indicate wrongdoing.</p>
          </div>
          {project.contractor_id && !project.contractor_name?.includes('Unassigned') && (
            <Link className="text-link" to={`/contractors/${project.contractor_id}`}>
              Contractor intelligence →
            </Link>
          )}
        </div>
        {network && network.is_available === false ? (
          <div className="empty-panel" style={{ padding: '24px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-secondary)' }}>
              {network.message || "Network analysis unavailable for this dataset because required relationship identifiers are not present."}
            </p>
          </div>
        ) : (
          <NetworkGraph data={network || { nodes: [], edges: [], summary: {} }} />
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Investigation history</h2>
            <p>Officer actions are retained in the audit trail.</p>
          </div>
        </div>
        {investigations.length ? (
          <div className="investigation-history">
            {investigations.map((i: any) => (
              <div key={i.id || i.investigation_id}>
                <b>{i.status}</b>
                <span>{i.officer}</span>
                <p>{i.remarks || 'No remarks recorded.'}</p>
                <small>{formatDate(i.updated_at || i.created_at)}</small>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-panel">No investigation has been opened for this project yet.</div>
        )}
      </section>

      {modal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Open investigation</h2>
            <p>
              Create a review record for {project.project_id}. The officer may update the final status later.
            </p>
            <label>
              Officer remarks
              <textarea
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="Record the verification scope, documents requested, or field visit plan."
                rows={5}
              />
            </label>
            <div className="modal-actions">
              <button className="btn secondary" onClick={() => setModal(false)}>
                Cancel
              </button>
              <button className="btn primary" disabled={saving} onClick={createReview}>
                {saving ? 'Saving…' : 'Create review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
