import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Download, Search } from 'lucide-react'
import { api, formatINR, type Project } from '../services/api'
import { DataSourceBadge, ErrorState, PageHeading, PageLoader, RiskBadge, Select } from '../components/UI'

export default function Projects() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState<any>()
  const [options, setOptions] = useState<any>()
  const [error, setError] = useState('')

  const params = new URLSearchParams(searchParams)
  const search = params.get('search') || ''
  const state = params.get('state') || ''
  const risk = params.get('risk_level') || ''
  const page = Number(params.get('page') || 1)

  const update = (values: Record<string, string>) => {
    const p = new URLSearchParams(searchParams)
    Object.entries(values).forEach(([key, value]) => {
      if (value) p.set(key, value)
      else p.delete(key)
    })
    if (!('page' in values)) p.delete('page')
    setSearchParams(p)
  }

  const load = () => {
    setError('')
    api.projects(`?${params}`).then(setData).catch(e => setError(e.message))
    api.options().then(setOptions).catch(() => undefined)
  }

  useEffect(load, [searchParams])

  useEffect(() => {
    const handleDsChange = () => load()
    window.addEventListener('mplad-datasource-changed', handleDsChange)
    return () => window.removeEventListener('mplad-datasource-changed', handleDsChange)
  }, [])

  const exportCSV = () => {
    if (!data?.items?.length) return
    const headers = [
      'Project ID',
      'State',
      'District',
      'Project Type',
      'Contractor',
      'Sanctioned Amount (INR)',
      'Expenditure (INR)',
      'Risk Score',
      'Risk Level',
      'Status',
    ]
    const rows = data.items.map((p: Project) => [
      `"${p.project_id}"`,
      `"${p.state}"`,
      `"${p.district}"`,
      `"${p.project_type}"`,
      `"${p.contractor_name || ''}"`,
      p.sanctioned_amount,
      p.expenditure,
      p.risk_score,
      `"${p.risk_level}"`,
      `"${p.status}"`,
    ])
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `mplad_projects_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (error) return <ErrorState message={error} retry={load} />
  if (!data || !options) return <PageLoader label="Loading project register…" />

  return (
    <>
      <PageHeading
        eyebrow="PROJECT REGISTER"
        title="Projects"
        description={`${data.total.toLocaleString('en-IN')} projects in the selected monitoring scope.`}
        action={
          <button className="btn secondary" onClick={exportCSV}>
            <Download size={16} /> Export view
          </button>
        }
      />
      <div className="filter-row panel">
        <div className="search-field">
          <Search size={17} />
          <input
            value={search}
            onChange={e => update({ search: e.target.value })}
            placeholder="Project ID, contractor or location"
          />
        </div>
        <Select
          value={state}
          onChange={x => update({ state: x })}
          options={options.states}
          label="All states"
        />
        <Select
          value={risk}
          onChange={x => update({ risk_level: x })}
          options={['Low', 'Medium', 'High', 'Critical']}
          label="All risk levels"
        />
        <Select
          value={params.get('project_type') || ''}
          onChange={x => update({ project_type: x })}
          options={options.project_types}
          label="All project types"
        />
        <Select
          value={params.get('status') || ''}
          onChange={x => update({ status: x })}
          options={['Sanctioned', 'Ongoing', 'Completed']}
          label="All statuses"
        />
        <button className="btn ghost" onClick={() => setSearchParams({})}>
          Reset
        </button>
      </div>
      <section className="panel table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Project ID</th>
                <th>Source</th>
                <th>State / district</th>
                <th>Project type</th>
                <th>Contractor</th>
                <th>
                  <button
                    onClick={() =>
                      update({
                        sort_by: 'amount',
                        order: params.get('order') === 'asc' ? 'desc' : 'asc',
                      })
                    }
                  >
                    Sanctioned amount ↕
                  </button>
                </th>
                <th>Expenditure</th>
                <th>
                  <button
                    onClick={() =>
                      update({
                        sort_by: 'risk_score',
                        order: params.get('order') === 'asc' ? 'desc' : 'asc',
                      })
                    }
                  >
                    Risk score ↕
                  </button>
                </th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((p: Project) => (
                <tr key={p.project_id}>
                  <td className="id-cell">
                    <b>{p.project_id}</b>
                    {p.source_record_id && p.source_record_id !== p.project_id && (
                      <small style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.68rem' }}>
                        Schema Ref: {p.source_record_id}
                      </small>
                    )}
                  </td>
                  <td>
                    <DataSourceBadge source={p.data_source} />
                  </td>
                  <td>
                    {p.state}
                    <small>{p.district}</small>
                  </td>
                  <td>{p.project_type}</td>
                  <td>
                    {p.contractor_name?.includes('Unassigned') ? (
                      <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Unassigned (Dept)</span>
                    ) : (
                      p.contractor_name || <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Unassigned</span>
                    )}
                  </td>
                  <td>{formatINR(p.sanctioned_amount)}</td>
                  <td>{formatINR(p.expenditure)}</td>
                  <td>
                    <div className="score-cell">
                      <b>{p.risk_score}</b>
                      <RiskBadge level={p.risk_level} />
                    </div>
                  </td>
                  <td>
                    <span className="status-pill">{p.status}</span>
                  </td>
                  <td>
                    <Link className="row-link" to={`/projects/${p.project_id}`}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <span>
            Page {data.page} of {data.pages} · {data.total.toLocaleString('en-IN')} records
          </span>
          <div>
            <button
              className="btn secondary"
              disabled={page <= 1}
              onClick={() => update({ page: String(page - 1) })}
            >
              Previous
            </button>
            <button
              className="btn secondary"
              disabled={page >= data.pages}
              onClick={() => update({ page: String(page + 1) })}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
