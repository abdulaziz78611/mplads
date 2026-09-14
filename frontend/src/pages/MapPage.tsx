import { useEffect, useState } from 'react'
import { AlertCircle, MapPinned } from 'lucide-react'
import { api, getActiveDataSource, type Project } from '../services/api'
import { ErrorState, Notice, PageHeading, PageLoader, Select } from '../components/UI'
import { ProjectMap } from '../components/MapView'

export default function MapPage() {
  const [items, setItems] = useState<Project[]>()
  const [options, setOptions] = useState<any>()
  const [quality, setQuality] = useState<any>()
  const [state, setState] = useState('')
  const [risk, setRisk] = useState('')
  const [error, setError] = useState('')
  const activeDs = getActiveDataSource()

  const load = () => {
    const q = new URLSearchParams()
    if (state) q.set('state', state)
    if (risk) q.set('risk_level', risk)
    Promise.all([
      api.mapProjects(q.size ? `?${q}` : ''),
      api.options(),
      api.dataQuality().catch(() => null),
    ])
      .then(([a, b, qReport]) => {
        setItems(a)
        setOptions(b)
        if (qReport) setQuality(qReport)
      })
      .catch(e => setError(e.message))
  }

  useEffect(load, [state, risk])

  useEffect(() => {
    const handleDsChange = () => load()
    window.addEventListener('mplad-datasource-changed', handleDsChange)
    return () => window.removeEventListener('mplad-datasource-changed', handleDsChange)
  }, [])

  if (error) return <ErrorState message={error} retry={load} />
  if (!items || !options) return <PageLoader label="Preparing geographic signals…" />

  const isOfficial = activeDs === 'official'
  const unmappedCount = quality ? quality.missing_coordinates_count : 0

  return (
    <>
      <PageHeading
        eyebrow="GEOGRAPHIC MONITORING"
        title="Project Map"
        description={
          isOfficial
            ? 'Geographic distribution for official data pipeline. In compliance with data integrity standards, representative markers are withheld.'
            : 'Geographic visualization of monitored works. Use location clusters as a prompt for field verification, not a conclusion.'
        }
        action={
          <div className="map-count" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPinned size={18} />
            <b>{items.length}</b> geocoded works
          </div>
        }
      />

      {isOfficial && (
        <div
          className="notice"
          style={{
            background: 'rgba(59, 130, 246, 0.08)',
            borderLeft: '4px solid #3b82f6',
            color: '#1e3a8a',
            marginBottom: '16px',
            padding: '16px 20px',
            borderRadius: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <AlertCircle size={22} style={{ flexShrink: 0, marginTop: '2px', color: '#2563eb' }} />
            <div>
              <strong style={{ fontSize: '1rem', display: 'block', marginBottom: '4px' }}>
                Location coordinates unavailable in official source data.
              </strong>
              <span style={{ fontSize: '0.875rem', lineHeight: '1.5' }}>
                Official MoSPI eSAKSHI source datasets provide state, district, constituency, and work location descriptions, but do not provide geographic GPS coordinates. In compliance with strict data integrity standards, no fabricated or representative coordinates are displayed in official mode. Representative coordinates are reserved strictly for Demo Showcase mode.
              </span>
            </div>
          </div>
        </div>
      )}

      <Notice>
        Marker colours show composite risk bands. Geographic clustering identifies adjacent comparable works within a 1.5–3.0 km radius for supervisory review.
      </Notice>

      <div className="filter-row panel">
        <label>
          State
          <Select value={state} onChange={setState} options={options.states} />
        </label>
        <label>
          Risk level
          <Select value={risk} onChange={setRisk} options={['Low', 'Medium', 'High', 'Critical']} />
        </label>
        <button
          className="btn ghost"
          onClick={() => {
            setState('')
            setRisk('')
          }}
        >
          Clear filters
        </button>
      </div>

      <ProjectMap projects={items} />
    </>
  )
}
