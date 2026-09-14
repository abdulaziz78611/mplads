import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, RefreshCw } from 'lucide-react'
import { api, formatDate } from '../services/api'
import { DataSourceBadge, ErrorState, PageHeading, PageLoader, RiskBadge, Select } from '../components/UI'

const statuses = ['New', 'Open', 'Under Review', 'Verification Requested', 'Verified', 'False Positive', 'Closed']

export default function Alerts() {
  const [data, setData] = useState<any>()
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [message, setMessage] = useState('')
  const [running, setRunning] = useState(false)

  const load = () => {
    setError('')
    api.alerts(filter ? `?status=${encodeURIComponent(filter)}` : '')
      .then(setData)
      .catch(e => setError(e.message))
  }

  useEffect(load, [filter])

  useEffect(() => {
    const handler = () => load()
    window.addEventListener('mplad-datasource-changed', handler)
    return () => window.removeEventListener('mplad-datasource-changed', handler)
  }, [])

  const update = async (id: string, value: string) => {
    try {
      await api.updateAlert(id, value)
      setMessage(`Alert ${id} updated to “${value}”.`)
      load()
    } catch (e: any) {
      setMessage(e.message)
    }
  }

  const rerun = async () => {
    setRunning(true)
    try {
      const r = await api.rerunAnalysis()
      setMessage(`Analysis refreshed across ${r.analysed.toLocaleString('en-IN')} projects.`)
      load()
    } catch (e: any) {
      setMessage(e.message)
    } finally {
      setRunning(false)
    }
  }

  if (error) return <ErrorState message={error} retry={load} />
  if (!data) return <PageLoader label="Loading alerts…" />

  return (
    <>
      <PageHeading
        eyebrow="ALERT MANAGEMENT"
        title="Prioritised Alerts"
        description="Review and verification status is recorded in an auditable supervisory workflow."
        action={
          <button className="btn secondary" onClick={rerun} disabled={running}>
            <RefreshCw size={16} className={running ? 'spin' : ''} />
            {running ? 'Running analysis…' : 'Refresh analysis'}
          </button>
        }
      />

      {message && (
        <div className="success-toast">
          <Check size={16} />
          {message}
        </div>
      )}

      <div className="panel alert-filter">
        <label>
          Alert status{' '}
          <Select value={filter} onChange={setFilter} options={statuses} label="All alert statuses" />
        </label>
        <span>{data.total} matching alerts</span>
      </div>

      <section className="panel table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Alert ID</th>
                <th>Source</th>
                <th>Project</th>
                <th>Alert type</th>
                <th>Severity</th>
                <th>Risk</th>
                <th>Description</th>
                <th>Created</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((x: any) => (
                <tr key={x.alert_id}>
                  <td className="id-cell small-id">{x.alert_id}</td>
                  <td>
                    <DataSourceBadge source={x.data_source} />
                  </td>
                  <td>
                    <Link className="row-link" to={`/projects/${x.project_id}`}>
                      {x.project_id}
                    </Link>
                    <small>
                      {x.district}, {x.state}
                    </small>
                  </td>
                  <td>{x.alert_type}</td>
                  <td>
                    <RiskBadge level={x.severity} />
                  </td>
                  <td>
                    <b>{x.risk_score}</b>
                  </td>
                  <td className="description-cell">{x.description}</td>
                  <td>{formatDate(x.created_at)}</td>
                  <td>
                    <select
                      className="inline-select"
                      value={x.status}
                      onChange={e => update(x.alert_id, e.target.value)}
                    >
                      {statuses.map(s => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <Link className="row-link" to={`/projects/${x.project_id}`}>
                      Open
                    </Link>
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
