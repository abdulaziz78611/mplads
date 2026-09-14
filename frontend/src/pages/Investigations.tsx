import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ClipboardCheck, ClipboardPlus, Search, X } from 'lucide-react'
import { api, formatDate } from '../services/api'
import { ErrorState, PageHeading, PageLoader, Select } from '../components/UI'

const statuses = ['Open', 'Under Review', 'Verification Requested', 'Verified', 'False Positive', 'Closed']

export default function Investigations() {
  const [items, setItems] = useState<any[]>()
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modal, setModal] = useState(false)
  const [projectId, setProjectId] = useState('MPLAD-DEMO-00421')
  const [officer, setOfficer] = useState('Aditi Sharma')
  const [status, setStatus] = useState('Under Review')
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    setError('')
    api.investigations()
      .then(setItems)
      .catch(e => setError(e.message))
  }

  useEffect(() => {
    load()
  }, [])

  const change = async (id: number, newStatus: string) => {
    try {
      await api.updateInvestigation(id, { status: newStatus })
      setMessage(`Investigation #${id} updated to "${newStatus}".`)
      load()
    } catch (e: any) {
      setMessage(e.message)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId) return
    setSaving(true)
    try {
      await api.createInvestigation({
        project_id: projectId.trim().toUpperCase(),
        officer: officer.trim() || 'Monitoring Officer',
        status,
        remarks: remarks.trim() || 'Investigation opened by monitoring officer.'
      })
      setMessage(`Investigation created for project ${projectId.trim().toUpperCase()}.`)
      setModal(false)
      setRemarks('')
      load()
    } catch (e: any) {
      setMessage(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (error) return <ErrorState message={error} retry={load} />
  if (!items) return <PageLoader label="Loading investigation register…" />

  const filtered = items.filter(i => {
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      (i.project_id || '').toLowerCase().includes(q) ||
      (i.officer || '').toLowerCase().includes(q) ||
      (i.remarks || '').toLowerCase().includes(q) ||
      (i.district || '').toLowerCase().includes(q)
    const matchesStatus = !statusFilter || i.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <>
      <PageHeading
        eyebrow="INVESTIGATION REGISTER"
        title="Officer investigations"
        description="Actions, notes and review status changes are preserved as an auditable compliance record."
        action={
          <button className="btn primary" onClick={() => setModal(true)}>
            <ClipboardPlus size={16} /> Open investigation
          </button>
        }
      />
      {message && (
        <div className="success-toast">
          <Check size={16} />
          {message}
        </div>
      )}

      <div className="filter-row panel">
        <div className="search-field">
          <Search size={17} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by project ID, officer name, or remarks"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={statuses}
          label="All statuses"
        />
        <span className="record-count">{filtered.length} investigations</span>
      </div>

      {filtered.length ? (
        <section className="panel table-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Project ID</th>
                  <th>Project Context</th>
                  <th>Officer</th>
                  <th>Remarks</th>
                  <th>Review Status</th>
                  <th>Last Updated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(i => (
                  <tr key={i.investigation_id}>
                    <td className="id-cell">{i.project_id}</td>
                    <td>
                      {i.project_type || 'Infrastructure'}
                      <small>{i.district || '—'}</small>
                    </td>
                    <td><b>{i.officer || 'Monitoring Officer'}</b></td>
                    <td className="description-cell">{i.remarks || '—'}</td>
                    <td>
                      <select
                        className="inline-select"
                        value={i.status || 'Open'}
                        onChange={e => change(i.investigation_id, e.target.value)}
                      >
                        {statuses.map(s => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{formatDate(i.updated_at || i.created_at)}</td>
                    <td>
                      <Link className="row-link" to={`/projects/${i.project_id}`}>
                        Open project
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="empty-full">
          <ClipboardCheck size={32} />
          <h2>No matching investigations</h2>
          <p>
            {items.length
              ? 'No investigations match the selected filters.'
              : 'Open a review record for any project to record field visits, document checks, and status decisions.'}
          </p>
          <button className="btn primary" onClick={() => setModal(true)}>
            <ClipboardPlus size={16} /> Open first review
          </button>
        </section>
      )}

      {modal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Open New Investigation</h2>
            <p>
              Log an official verification case against an MPLAD project. All changes update the audit trail.
            </p>
            <form onSubmit={handleCreate}>
              <label>
                Project ID
                <input
                  type="text"
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                  placeholder="e.g. MPLAD-DEMO-00421"
                  required
                />
              </label>
              <label>
                Investigating Officer
                <input
                  type="text"
                  value={officer}
                  onChange={e => setOfficer(e.target.value)}
                  placeholder="Officer Name"
                  required
                />
              </label>
              <label>
                Initial Review Status
                <select value={status} onChange={e => setStatus(e.target.value)}>
                  {statuses.map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Scope & Remarks
                <textarea
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder="Specify documents requested, milestone discrepancies, or inspection plan."
                  rows={4}
                />
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn primary" disabled={saving}>
                  {saving ? 'Creating…' : 'Create investigation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
