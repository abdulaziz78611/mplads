import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, MapPin, Search, ShieldAlert } from 'lucide-react'
import { api, formatINR } from '../services/api'
import { ContractorTimeline, RiskPie } from '../components/Charts'
import { ErrorState, PageHeading, PageLoader, RiskBadge } from '../components/UI'
import { TiltCard } from '../components/Animations'

export function Contractors() {
  const [items, setItems] = useState<any[]>()
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const load = () => {
    setError('')
    api.contractors()
      .then(setItems)
      .catch(e => setError(e.message))
  }

  useEffect(() => {
    load()
    const handler = () => load()
    window.addEventListener('mplad-datasource-changed', handler)
    return () => window.removeEventListener('mplad-datasource-changed', handler)
  }, [])

  if (error) return <ErrorState message={error} retry={load} />
  if (!items) return <PageLoader label="Loading contractor intelligence…" />

  const searchLower = search.toLowerCase()
  const searchUpper = search.toUpperCase()
  const filtered = (items || []).filter(x => {
    const name = (x.name || '').toLowerCase()
    const id = (x.contractor_id || '').toUpperCase()
    return name.includes(searchLower) || id.includes(searchUpper)
  })

  return (
    <>
      <PageHeading
        eyebrow="CONTRACTOR INTELLIGENCE"
        title="Relationship monitoring"
        description="Aggregate project context helps identify concentrated activity for human-led review."
      />
      <div className="filter-row panel">
        <div className="search-field">
          <Search size={17} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search contractor name or ID"
          />
        </div>
        <span className="record-count">{filtered.length} contractors</span>
      </div>
      <section className="contractor-grid">
        {filtered.map((c, i) => (
          <TiltCard key={c.contractor_id} maxTilt={6} className={`stagger-in stagger-${(i % 4) + 1}`}>
            <Link
              className="contractor-card"
              to={`/contractors/${c.contractor_id}`}
              style={{ height: '100%' }}
            >
            <div className="contractor-icon">
              <Building2 size={20} />
            </div>
            <div className="contractor-name">
              <h2>{c.name || 'Unassigned'}</h2>
              <span>
                {c.contractor_id} · <MapPin size={12} />
                {c.district || 'Unknown'}
              </span>
            </div>
            <div className="contractor-stats">
              <span>
                <small>Projects</small>
                <b>{c.total_projects ?? 0}</b>
              </span>
              <span>
                <small>Sanctioned value</small>
                <b>{formatINR(c.total_value || 0)}</b>
              </span>
              <span>
                <small>High / critical risk</small>
                <b className={c.high_risk_projects ? 'high-text' : ''}>
                  {c.high_risk_projects ?? 0}
                </b>
              </span>
              <span>
                <small>Average risk</small>
                <b>{c.average_risk ?? 0}</b>
              </span>
            </div>
            <span className="card-open">Open intelligence →</span>
            </Link>
          </TiltCard>
        ))}
      </section>
    </>
  )
}

export function ContractorDetail() {
  const { contractorId = '' } = useParams()
  const [data, setData] = useState<any>()
  const [error, setError] = useState('')

  const load = () => {
    if (!contractorId) return
    setError('')
    api.contractor(contractorId)
      .then(setData)
      .catch(e => setError(e.message))
  }

  useEffect(() => {
    load()
  }, [contractorId])

  if (error) return <ErrorState message={error} retry={load} />
  if (!data) return <PageLoader label="Loading contractor profile…" />

  const districtsList = Array.isArray(data.districts) ? data.districts.join(', ') : 'None'
  const linkedProjects = data.projects || []

  return (
    <>
      <Link className="back-link" to="/contractors">
        <ArrowLeft size={16} /> Back to contractor intelligence
      </Link>
      <PageHeading
        eyebrow="CONTRACTOR PROFILE"
        title={data.name || 'Contractor Profile'}
        description={`${data.contractor_id || ''} · ${data.registration_info || ''}`}
      />
      <div className="contractor-detail-top">
        <section className="panel contractor-overview">
          <div className="contractor-icon large">
            <Building2 size={27} />
          </div>
          <div>
            <span>Home district</span>
            <h2>{data.home_district || 'Unknown'}</h2>
            <p>
              Active across {data.districts?.length || 0} districts: {districtsList}.
            </p>
          </div>
          <div className="overview-stat">
            <small>Total projects</small>
            <b>{data.total_projects ?? 0}</b>
          </div>
          <div className="overview-stat">
            <small>Total value</small>
            <b>{formatINR(data.total_value || 0)}</b>
          </div>
          <div className="overview-stat">
            <small>Average project value</small>
            <b>{formatINR(data.average_project_value || 0)}</b>
          </div>
        </section>
      </div>
      <div className="dashboard-grid">
        <section className="panel span-7">
          <div className="panel-head">
            <div>
              <h2>Activity over time</h2>
              <p>Contractor-linked project count</p>
            </div>
          </div>
          <ContractorTimeline data={data.timeline || []} />
        </section>
        <section className="panel span-5">
          <div className="panel-head">
            <div>
              <h2>Risk distribution</h2>
              <p>Composite risk of linked projects</p>
            </div>
          </div>
          <RiskPie data={data.risk_distribution || []} />
        </section>
      </div>
      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <h2>
              <ShieldAlert size={18} /> Linked projects
            </h2>
            <p>Ordered by composite risk score</p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Project ID</th>
                <th>District</th>
                <th>Type</th>
                <th>Sanctioned value</th>
                <th>Risk</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {linkedProjects.map((p: any) => (
                <tr key={p.project_id}>
                  <td className="id-cell">{p.project_id}</td>
                  <td>
                    {p.district}
                    <small>{p.state}</small>
                  </td>
                  <td>{p.project_type}</td>
                  <td>{formatINR(p.sanctioned_amount || 0)}</td>
                  <td>
                    <div className="score-cell">
                      <b>{p.risk_score ?? 0}</b>
                      <RiskBadge level={p.risk_level || 'Low'} />
                    </div>
                  </td>
                  <td>
                    <span className="status-pill">{p.status || 'Ongoing'}</span>
                  </td>
                  <td>
                    <Link className="row-link" to={`/projects/${p.project_id}`}>
                      Investigate
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

export default Contractors
