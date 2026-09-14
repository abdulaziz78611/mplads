import { useEffect, useState } from 'react'
import { Check, DatabaseZap, FileUp, HardDrive, RefreshCw, Shield, Upload, UserCog } from 'lucide-react'
import { api, formatDate } from '../services/api'
import { Notice, PageHeading, PageLoader } from '../components/UI'

export default function Settings() {
  const [message, setMessage] = useState('')
  const [running, setRunning] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [batches, setBatches] = useState<any[]>([])
  const [quality, setQuality] = useState<any>()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadSource, setUploadSource] = useState('official')

  const loadData = () => {
    Promise.all([
      api.importBatches().catch(() => []),
      api.dataQuality().catch(() => null),
    ]).then(([b, q]) => {
      setBatches(b)
      setQuality(q)
    })
  }

  useEffect(() => {
    loadData()
  }, [])

  const runAnalysis = async () => {
    setRunning(true)
    try {
      const result = await api.rerunAnalysis()
      setMessage(
        `Analysis completed for ${result.analysed.toLocaleString('en-IN')} projects. ${result.critical_projects || 0} critical-risk patterns identified for review.`
      )
      loadData()
    } catch (e: any) {
      setMessage(e.message)
    } finally {
      setRunning(false)
    }
  }

  const handleSeedOfficial = async () => {
    setSeeding(true)
    try {
      const res = await api.seedOfficial()
      setMessage(`Official pipeline dataset synchronized: ${res.valid_records} records under batch ${res.batch_id}.`)
      loadData()
      window.dispatchEvent(new CustomEvent('mplad-datasource-changed', { detail: 'official' }))
    } catch (e: any) {
      setMessage(e.message)
    } finally {
      setSeeding(false)
    }
  }

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      const res = await api.importData(formData, uploadSource)
      setMessage(`Dataset imported successfully: ${res.valid_records} records registered. Quality score: ${res.data_quality_score}/100.`)
      setSelectedFile(null)
      loadData()
      window.dispatchEvent(new CustomEvent('mplad-datasource-changed', { detail: uploadSource }))
    } catch (e: any) {
      setMessage(e.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="SYSTEM CONFIGURATION"
        title="Settings & Data Management"
        description="Dataset ingestion, dual-mode isolation, multi-engine calibration, and security controls."
      />

      <Notice>
        MPLAD Sentinel supports dual operational modes: <b>Mode 1 (Official Data Import Pipeline)</b> utilizes records conforming strictly to the official MoSPI eSAKSHI schema with full provenance tracking; <b>Mode 2 (Demonstration Showcase)</b> provides calibrated synthetic benchmarks for SIH prototype evaluation.
      </Notice>

      {message && (
        <div className="success-toast">
          <Check size={16} />
          {message}
        </div>
      )}

      {quality && (
        <div
          className="panel"
          style={{
            padding: '18px 24px',
            marginBottom: '24px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            background: 'var(--bg-card)',
          }}
        >
          <div>
            <small style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Overall Quality Score
            </small>
            <strong style={{ fontSize: '1.4rem', color: '#059669' }}>{quality.overall_quality_score}%</strong>
          </div>
          <div>
            <small style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Active Mode Projects
            </small>
            <strong style={{ fontSize: '1.4rem' }}>{quality.total_projects}</strong>
          </div>
          <div>
            <small style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Geocoded Records
            </small>
            <strong style={{ fontSize: '1.4rem' }}>{quality.valid_coordinates_count}</strong>
          </div>
          <div>
            <small style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Coordinate Completeness
            </small>
            <strong style={{ fontSize: '1.4rem' }}>{quality.coordinate_completeness_pct}%</strong>
          </div>
        </div>
      )}

      <div className="settings-grid">
        {/* Card 1: Data Ingestion Pipeline */}
        <section className="panel setting-card" style={{ gridColumn: 'span 2' }}>
          <div className="setting-icon">
            <FileUp size={21} />
          </div>
          <h2>Data Ingestion Pipeline (CSV / JSON)</h2>
          <p>
            Upload external MoSPI eSAKSHI exports or district administrative records. The parser normalizes columns, validates geographical coordinates, and records batch provenance.
          </p>
          <form onSubmit={handleFileUpload} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="file"
                accept=".csv,.json"
                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                style={{ fontSize: '0.85rem' }}
              />
              <select
                value={uploadSource}
                onChange={e => setUploadSource(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)' }}
              >
                <option value="official">Target: Official Pipeline (eSAKSHI Schema)</option>
                <option value="synthetic">Target: Demonstration Showcase</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn primary" type="submit" disabled={!selectedFile || uploading}>
                <Upload size={16} />
                {uploading ? 'Importing dataset…' : 'Import Dataset'}
              </button>
              <button className="btn secondary" type="button" disabled={seeding} onClick={handleSeedOfficial}>
                <RefreshCw size={16} className={seeding ? 'spin' : ''} />
                {seeding ? 'Syncing…' : 'Re-sync Official Pipeline Data'}
              </button>
            </div>
          </form>
        </section>

        {/* Card 2: Anomaly Engine Pass */}
        <section className="panel setting-card">
          <div className="setting-icon">
            <DatabaseZap size={21} />
          </div>
          <h2>Anomaly Detection Engine</h2>
          <p>
            Triggers multi-engine scoring (Isolation Forest, Z-Score, Rules, Network). Weights dynamically renormalize if vendor or GPS features are unassigned.
          </p>
          <button className="btn primary" disabled={running} onClick={runAnalysis}>
            {running ? 'Running analysis…' : 'Run Anomaly Detection Pass'}
          </button>
        </section>

        {/* Card 3: Risk Scoring Calibration */}
        <section className="panel setting-card">
          <div className="setting-icon">
            <Shield size={21} />
          </div>
          <h2>Adaptive Feature Weights</h2>
          <p>
            Standard: Rules 30% · ML 30% · Statistics 20% · Network 20%. When contractor links are unassigned in official exports, network weight drops to 0% and redistributes proportionally (Rules 40%, ML 35%, Stat 25%).
          </p>
          <span className="locked" style={{ color: '#059669', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
            Dynamic Weight Normalization Active
          </span>
        </section>

        {/* Card 4: Access Security */}
        <section className="panel setting-card">
          <div className="setting-icon">
            <UserCog size={21} />
          </div>
          <h2>Authentication & Security</h2>
          <p>
            Session access is secured via JWT bearer tokens and salted bcrypt password hashing. Designed for seamless OAuth2 integration with MeriPehchan / DigiLocker.
          </p>
          <span className="locked">Monitoring Officer Role Active</span>
        </section>
      </div>

      {/* Batch Ingestion Audit History */}
      <section className="panel table-panel" style={{ marginTop: '24px' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)' }}>
          <h2 style={{ fontSize: '1rem', margin: 0 }}>Data Ingestion Batch History & Quality Audit</h2>
          <small style={{ color: 'var(--text-secondary)' }}>Provenance records and quality scores for all imported datasets</small>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Batch ID</th>
                <th>Source Portal</th>
                <th>File Name</th>
                <th>Valid Records</th>
                <th>Missing Coords</th>
                <th>Missing Vendors</th>
                <th>Quality Score</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {batches.length ? (
                batches.map((b: any) => (
                  <tr key={b.batch_id}>
                    <td>
                      <code>{b.batch_id}</code>
                    </td>
                    <td>{b.source_name}</td>
                    <td>{b.file_name}</td>
                    <td>
                      <b>{b.valid_records}</b> / {b.total_records}
                    </td>
                    <td>{b.missing_coords_count}</td>
                    <td>{b.missing_contractors_count}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: b.data_quality_score >= 80 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                          color: b.data_quality_score >= 80 ? '#065f46' : '#854d0e',
                        }}
                      >
                        {b.data_quality_score} / 100
                      </span>
                    </td>
                    <td>{formatDate(b.created_at)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                    No manual import batches recorded yet. Default official dataset active.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
