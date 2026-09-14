import { useEffect, useState } from 'react'
import { FileDown, FileText, Search } from 'lucide-react'
import { api, formatINR, type Project } from '../services/api'
import { DataSourceBadge, ErrorState, Notice, PageHeading, PageLoader, RiskBadge } from '../components/UI'

export default function Reports() {
  const [data, setData] = useState<any>()
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [generatingId, setGeneratingId] = useState<string | null>(null)

  const load = () => {
    api.projects('?risk_level=Critical&page_size=100')
      .then(setData)
      .catch(e => setError(e.message))
  }

  useEffect(load, [])

  useEffect(() => {
    const handler = () => load()
    window.addEventListener('mplad-datasource-changed', handler)
    return () => window.removeEventListener('mplad-datasource-changed', handler)
  }, [])

  const generate = async (id: string) => {
    setGeneratingId(id)
    try {
      const r = await api.report(id)
      const reportWindow = window.open('', '_blank')
      if (!reportWindow) return

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${r.report_title} - ${id}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 880px; margin: 40px auto; color: #1e293b; line-height: 1.5; padding: 0 20px; }
    .header { border-bottom: 3px solid #0b3957; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { color: #0b3957; margin: 0 0 6px 0; font-size: 24px; }
    .header p { color: #64748b; font-size: 13px; margin: 0; }
    .disclaimer { background: #fef3c7; border-left: 4px solid #d97706; padding: 14px 18px; border-radius: 4px; color: #92400e; font-size: 13px; margin-bottom: 24px; }
    h2 { color: #155a8a; font-size: 17px; margin: 28px 0 12px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
    th, td { padding: 9px 12px; border-bottom: 1px solid #e2e8f0; text-align: left; }
    th { background: #f8fafc; color: #475569; font-weight: 600; width: 35%; }
    .table-data th { width: auto; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 11px; text-transform: uppercase; }
    .badge-critical { background: #fee2e2; color: #b91c1c; }
    .badge-high { background: #ffedd5; color: #c2410c; }
    .badge-medium { background: #fef3c7; color: #b45309; }
    .badge-low { background: #e6f4ea; color: #107c41; }
    .stat-card { display: inline-block; background: #f1f5f9; padding: 10px 16px; border-radius: 6px; margin-right: 12px; font-size: 13px; }
    .stat-card b { display: block; font-size: 16px; color: #0f172a; margin-top: 2px; }
    @media print {
      body { margin: 0; padding: 10mm; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${r.report_title}</h1>
    <p>Generated on ${new Date(r.generated_at).toLocaleString('en-IN')} · Reference: <b>${id}</b></p>
  </div>

  <div class="disclaimer">
    <strong>Decision Support Notice:</strong> ${r.disclaimer}
  </div>

  <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px; font-size: 12.5px; line-height: 1.6;">
    <div><b>Target Source System:</b> MoSPI MPLADS–eSAKSHI (https://mplads.mospi.gov.in)</div>
    <div><b>Current Dataset:</b> ${r.project.data_source === 'official' ? '180 schema-conforming validation records based on official data structure' : 'Synthetic demonstration showcase (1,202 records)'}</div>
    <div><b>Identifier Type:</b> ${r.project.data_source === 'official' ? 'Prototype Schema Reference Code (' + (r.project.source_record_id || id) + ')' : 'Synthetic Identifier (' + id + ')'} &nbsp;|&nbsp; <b>Batch ID:</b> ${r.project.import_batch_id || 'Initial Validation Batch'} &nbsp;|&nbsp; <b>Data Quality Tag:</b> ${r.project.data_quality_status || 'Clean'}</div>
  </div>

  <h2>1. Project Particulars</h2>
  <table>
    ${Object.entries(r.project)
      .filter(([k]) => !['payments', 'anomalies', 'investigations'].includes(k))
      .map(([k, v]) => `<tr><th>${k.replace(/_/g, ' ').toUpperCase()}</th><td>${typeof v === 'number' && k.includes('amount') ? formatINR(v as number) : String(v ?? '—')}</td></tr>`)
      .join('')}
  </table>

  <h2>2. Risk Evaluation</h2>
  <div style="margin-bottom: 16px;">
    <div class="stat-card">Composite Risk Score <b>${r.risk.score} / 100</b></div>
    <div class="stat-card">Risk Classification <b>${r.risk.level}</b></div>
  </div>
  <p style="font-size: 13px; color: #475569;">${r.risk.method}</p>

  <h2>3. Traceable Anomaly Signals</h2>
  <table class="table-data">
    <thead>
      <tr>
        <th>Signal Type</th>
        <th>Severity</th>
        <th>Measured vs Expected</th>
        <th>Explanatory Context</th>
      </tr>
    </thead>
    <tbody>
      ${r.anomalies.map((a: any) => `
        <tr>
          <td><b>${a.type}</b></td>
          <td><span class="badge badge-${a.severity.toLowerCase()}">${a.severity}</span></td>
          <td>${a.measured} <small style="color:#64748b;">(Ref: ${a.expected})</small></td>
          <td>${a.explanation}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>4. Contractor Profile & District Context</h2>
  <p style="font-size: 13.5px;">
    <b>${r.contractor.name || 'Unassigned'}:</b> Total Projects: <b>${r.contractor.total_projects}</b> · Portfolio Value: <b>${formatINR(r.contractor.total_value)}</b> · Flagged Projects: <b>${r.contractor.high_risk_projects}</b>
  </p>

  <h2>5. Action Log & Officer Annotations</h2>
  ${r.investigations.length ? `
    <table class="table-data">
      <thead><tr><th>Officer</th><th>Status</th><th>Updated</th><th>Remarks</th></tr></thead>
      <tbody>
        ${r.investigations.map((i: any) => `<tr><td><b>${i.officer}</b></td><td>${i.status}</td><td>${new Date(i.updated_at).toLocaleDateString('en-IN')}</td><td>${i.remarks || '—'}</td></tr>`).join('')}
      </tbody>
    </table>
  ` : '<p style="color:#64748b;font-size:13px;">No formal review cases have been initiated on this project yet.</p>'}
</body>
</html>`

      reportWindow.document.write(html)
      reportWindow.document.close()
      reportWindow.focus()
      setTimeout(() => reportWindow.print(), 350)
    } catch (e: any) {
      setMessage(e.message)
    } finally {
      setGeneratingId(null)
    }
  }

  if (error) return <ErrorState message={error} retry={load} />
  if (!data) return <PageLoader label="Compiling report register…" />

  const items = (data.items || []).filter((x: Project) => {
    const q = search.toLowerCase()
    return x.project_id.toLowerCase().includes(q) || x.district.toLowerCase().includes(q)
  })

  return (
    <>
      <PageHeading
        eyebrow="AUDIT DOCUMENTATION"
        title="Investigation Reports"
        description="Generate formalized print-ready evidentiary briefing dossiers for administrative review."
      />
      {message && <Notice>{message}</Notice>}
      <section className="panel report-intro">
        <FileText size={26} />
        <div>
          <h2>Professional investigation summary</h2>
          <p>
            Select a prioritised project to compile project facts, financials, risk components,
            evidence, contractor context and officer remarks into a printable report.
          </p>
        </div>
      </section>
      <div className="filter-row panel">
        <div className="search-field">
          <Search size={17} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Find project ID or district"
          />
        </div>
      </div>
      <section className="panel table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Project ID</th>
                <th>Source</th>
                <th>District</th>
                <th>Project type</th>
                <th>Risk score</th>
                <th>Risk level</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((p: Project) => (
                <tr key={p.project_id}>
                  <td className="id-cell">{p.project_id}</td>
                  <td>
                    <DataSourceBadge source={p.data_source} />
                  </td>
                  <td>
                    {p.district}
                    <small>{p.state}</small>
                  </td>
                  <td>{p.project_type}</td>
                  <td>
                    <b>{p.risk_score}</b>
                  </td>
                  <td>
                    <RiskBadge level={p.risk_level} />
                  </td>
                  <td>
                    <button
                      className="row-link button-link"
                      disabled={generatingId === p.project_id}
                      onClick={() => generate(p.project_id)}
                    >
                      <FileDown size={14} />
                      {generatingId === p.project_id ? 'Generating…' : 'Generate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
