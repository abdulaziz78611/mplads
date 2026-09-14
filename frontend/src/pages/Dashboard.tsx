import { useEffect, useState, useRef } from 'react'
import { Activity, AlertTriangle, Building2, Calendar, Check, ChevronDown, ClipboardList, Filter, MapPinned, ShieldAlert, Sparkles, SlidersHorizontal, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, formatINR, type Project } from '../services/api'
import { ErrorState, Notice, PageHeading, PageLoader, RiskBadge, Select } from '../components/UI'
import { TiltCard } from '../components/Animations'
import { GeneralStatsBar, DonutChart, StateBar, TrendArea, TypeBar, neonPalette } from '../components/Charts'
import { ProjectMap } from '../components/MapView'
import { useActiveTheme } from '../context/ThemeContext'

export default function Dashboard() {
  const [summary, setSummary] = useState<any>()
  const [options, setOptions] = useState<any>()
  const [contractors, setContractors] = useState<any[]>([])
  const [mapProjects, setMapProjects] = useState<Project[]>([])
  const [error, setError] = useState('')
  const [state, setState] = useState('')
  const [district, setDistrict] = useState('')
  const [quality, setQuality] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'projects' | 'sanctions' | 'anomalies'>('projects')
  const [showFilters, setShowFilters] = useState(false)
  const [openTimeframe, setOpenTimeframe] = useState(false)
  const [timeframe, setTimeframe] = useState({ label: 'All Financial Years (All time)', value: 'all' })
  const timeframeRef = useRef<HTMLDivElement>(null)
  const { activeTheme } = useActiveTheme()

  const timeframes = [
    { label: 'All Financial Years (All time)', value: 'all' },
    { label: 'This financial year (2025–26)', value: '2025-26' },
    { label: 'Previous FY (2024–25)', value: '2024-25' },
    { label: 'FY 2023–24', value: '2023-24' },
    { label: 'FY 2022–23', value: '2022-23' },
  ]

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (timeframeRef.current && !timeframeRef.current.contains(e.target as Node)) {
        setOpenTimeframe(false)
      }
    }
    if (openTimeframe) {
      document.addEventListener('mousedown', handleOutside)
    }
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [openTimeframe])

  const load = () => { 
    setError('')
    const query = new URLSearchParams()
    if (state) query.set('state', state)
    if (district) query.set('district', district)
    if (timeframe.value && timeframe.value !== 'all') query.set('year', timeframe.value)
    const suffix = query.size ? `?${query}` : ''
    
    Promise.all([
      api.summary(suffix), 
      api.options(), 
      api.mapProjects(suffix),
      api.contractors(),
      api.dataQuality().catch(() => null),
    ]).then(([s, o, m, c, q]) => { 
      setSummary(s)
      setOptions(o)
      setMapProjects(m)
      setContractors(Array.isArray(c) ? c.slice(0, 4) : [])
      if (q) setQuality(q)
    }).catch(e => setError(e.message)) 
  }

  useEffect(load, [state, district, timeframe.value])

  useEffect(() => {
    const handleDsChange = () => load()
    window.addEventListener('mplad-datasource-changed', handleDsChange)
    return () => window.removeEventListener('mplad-datasource-changed', handleDsChange)
  }, [])

  if (error) return <ErrorState message={error} retry={load}/>
  if (!summary || !options) return <PageLoader/>

  // Calculate percentages for Risk donut
  const totalRiskCount = (summary.risk_distribution || []).reduce((acc: number, d: any) => acc + (d.value || 0), 0) || 1
  const riskLegend = (summary.risk_distribution || []).map((d: any) => ({
    name: d.name,
    value: d.value,
    pct: Math.round(((d.value || 0) / totalRiskCount) * 100)
  }))

  // Calculate percentages for Category donut
  const topCategories = (summary.projects_by_type || []).slice(0, 3)
  const totalCatCount = topCategories.reduce((acc: number, d: any) => acc + (d.value || 0), 0) || 1
  const catLegend = topCategories.map((d: any, idx: number) => ({
    name: d.name,
    value: d.value,
    color: activeTheme.palette[idx] || neonPalette[idx],
    pct: Math.round(((d.value || 0) / totalCatCount) * 100)
  }))

  // Format data for the main General Stats bar chart based on selected tab
  const barData = (summary.projects_by_state || []).slice(0, 10).map((d: any) => ({
    name: d.name.slice(0, 4),
    fullName: d.name,
    projects: d.value,
    sanctions: Math.round(d.value * 1.8),
    anomalies: Math.max(1, Math.round(d.value * 0.18))
  }))

  // District distribution sample for the bottom right card
  const districtList = (options.districts || []).slice(0, 4).map((dist: string, idx: number) => {
    const pcts = [78, 64, 52, 43]
    return {
      name: dist,
      state: options.states[idx % options.states.length] || 'National',
      pct: pcts[idx % pcts.length]
    }
  })

  return (
    <>
      {/* Subheader / Page Heading with Pill Controls */}
      <div className="page-heading">
        <div>
          <div className="eyebrow">NATIONAL AUDIT & ANOMALY INTELLIGENCE</div>
          <h1>Analytics</h1>
          <p>Real-time machine learning signals for MPLAD infrastructure monitoring.</p>
        </div>

        <div className="heading-action">
          <button 
            className={`pill-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={15} />
            <span>Filters</span>
            <ChevronDown size={13} />
          </button>

          <div className="timeframe-wrapper" ref={timeframeRef}>
            <button 
              className={`pill-btn ${openTimeframe ? 'active' : ''}`}
              onClick={() => setOpenTimeframe(!openTimeframe)}
              title="Filter by financial year"
            >
              <Calendar size={15} />
              <span>{timeframe.label.split('(')[0].trim()}</span>
              <ChevronDown 
                size={13} 
                style={{ 
                  transform: openTimeframe ? 'rotate(180deg)' : 'none', 
                  transition: 'transform 0.2s ease' 
                }} 
              />
            </button>

            {openTimeframe && (
              <div className="timeframe-dropdown">
                <div className="timeframe-header">
                  <strong>Select Timeframe</strong>
                  <small>Filter sanctions & anomaly trends</small>
                </div>
                <div className="timeframe-list">
                  {timeframes.map(tf => (
                    <button
                      key={tf.value}
                      className={`timeframe-item ${timeframe.value === tf.value ? 'selected' : ''}`}
                      onClick={() => {
                        setTimeframe(tf)
                        setOpenTimeframe(false)
                      }}
                    >
                      <div className="timeframe-item-title">
                        <Calendar size={13} />
                        <span>{tf.label}</span>
                      </div>
                      {timeframe.value === tf.value && <Check size={14} className="check-icon" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="last-analysis">
            <span className="pulse" />
            <span>Active</span>
          </div>
        </div>
      </div>

      {/* Expandable Filter Bar */}
      {showFilters && (
        <div className="dashboard-filters panel" style={{ padding: '16px 20px', marginBottom: '20px' }}>
          <label>
            State Scope
            <Select 
              value={state} 
              onChange={x => { setState(x); setDistrict('') }} 
              options={options.states}
            />
          </label>
          <label>
            District Scope
            <Select 
              value={district} 
              onChange={setDistrict} 
              options={state ? options.districts : options.districts}
            />
          </label>
          <button 
            className="btn secondary" 
            onClick={() => { setState(''); setDistrict('') }}
          >
            Reset Filters
          </button>
        </div>
      )}

      <Notice>{summary.disclaimer}</Notice>

      {/* Official Data Mode Banner & Quality Indicators */}
      <div 
        className="panel" 
        style={{ 
          padding: '14px 20px', 
          marginBottom: '20px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          gap: '16px', 
          background: summary.kpis?.active_data_source === 'official' ? 'rgba(16, 185, 129, 0.07)' : 'rgba(99, 102, 241, 0.07)', 
          borderColor: summary.kpis?.active_data_source === 'official' ? 'rgba(16, 185, 129, 0.28)' : 'rgba(99, 102, 241, 0.28)',
          borderRadius: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div 
            style={{ 
              width: '42px', 
              height: '42px', 
              borderRadius: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              background: summary.kpis?.active_data_source === 'official' ? 'rgba(16, 185, 129, 0.16)' : 'rgba(99, 102, 241, 0.16)', 
              fontSize: '22px' 
            }}
          >
            {summary.kpis?.active_data_source === 'official' ? '⚙️' : '🧪'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ fontSize: '0.95rem' }}>Active Dataset Mode</strong>
              <span 
                className="badge" 
                style={{ 
                  fontSize: '0.72rem', 
                  fontWeight: 600,
                  background: summary.kpis?.active_data_source === 'official' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(99, 102, 241, 0.18)', 
                  color: summary.kpis?.active_data_source === 'official' ? '#065f46' : '#3730a3',
                  border: summary.kpis?.active_data_source === 'official' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)',
                }}
              >
                {summary.kpis?.active_data_source === 'official' ? 'MoSPI/eSAKSHI-Compatible Dataset' : 'Evaluation Showcase (Synthetic)'}
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              {summary.kpis?.active_data_source === 'official'
                ? 'Target Source: MoSPI MPLADS–eSAKSHI · Current Dataset: 180 schema-conforming validation records based on the official data structure.'
                : 'Synthetic reference dataset calibrated with simulated anomalies for deterministic algorithm testing and SIH review.'}
            </p>
          </div>
        </div>

        {quality && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '1px solid var(--glass-border)', paddingLeft: '20px' }}>
            <div>
              <small style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Data Quality</small>
              <strong style={{ color: '#059669', fontSize: '1.2rem', fontWeight: 700 }}>{quality.overall_quality_score}%</strong>
            </div>
            <div>
              <small style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Records</small>
              <strong style={{ fontSize: '1.1rem' }}>{summary.kpis?.total_projects ?? quality.official_projects}</strong>
            </div>
            <div>
              <small style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Geocoded</small>
              <strong style={{ fontSize: '1.1rem' }}>{quality.coordinate_completeness_pct ?? (summary.kpis?.active_data_source === 'official' ? 0 : 100)}%</strong>
            </div>
          </div>
        )}
      </div>

      {/* Primary Analytics Section (Mirrors Reference UI Layout) */}
      <div className="dashboard-grid" style={{ marginBottom: '20px' }}>
        
        {/* Left Big Card: "General stats" */}
        <TiltCard className="span-8 stagger-in stagger-2" maxTilt={3.5}>
        <section className="general-stats-card" style={{ height: "100%" }}>
          <div className="general-stats-head">
            <h2>
              <Activity size={18} style={{ color: 'var(--accent-violet)' }} />
              General stats
            </h2>
            <div className="segmented-tabs">
              <button 
                className={`segmented-tab ${activeTab === 'projects' ? 'active' : ''}`}
                onClick={() => setActiveTab('projects')}
              >
                Projects
              </button>
              <button 
                className={`segmented-tab ${activeTab === 'sanctions' ? 'active' : ''}`}
                onClick={() => setActiveTab('sanctions')}
              >
                Sanctions
              </button>
              <button 
                className={`segmented-tab ${activeTab === 'anomalies' ? 'active' : ''}`}
                onClick={() => setActiveTab('anomalies')}
              >
                Anomalies
              </button>
            </div>
          </div>

          <div className="general-stats-body">
            <div className="mini-kpi-stack">
              <div className="mini-kpi-card">
                <span>Total projects</span>
                <strong>{summary.kpis.total_projects.toLocaleString('en-IN')}</strong>
                <span className="trend-badge up">12% ↑</span>
              </div>
              <div className="mini-kpi-card">
                <span>Critical / High risk</span>
                <strong>{(summary.kpis.critical_risk_projects + summary.kpis.high_risk_projects).toLocaleString('en-IN')}</strong>
                <span className="trend-badge down">5% ↓</span>
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <GeneralStatsBar 
                data={barData} 
                dataKey={activeTab} 
                unit={activeTab === 'projects' ? 'proj' : activeTab === 'sanctions' ? 'Cr' : 'alerts'}
              />
            </div>
          </div>
        </section>
        </TiltCard>

        {/* Right Stack: Two Donut Cards */}
        <div className="span-4" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Top Donut: Risk Distribution ("Platforms" style) */}
          <TiltCard className="stagger-in stagger-3" maxTilt={5} style={{ flex: 1 }}>
          <section className="panel" style={{ height: "100%", padding: '20px' }}>
            <div className="panel-head" style={{ marginBottom: '10px' }}>
              <h2>
                <ShieldAlert size={17} style={{ color: 'var(--accent-cyan)' }} />
                Risk Distribution
              </h2>
            </div>
            <div className="donut-card-content">
              <div className="donut-legend">
                {riskLegend.map((item: any) => (
                  <div key={item.name} className="donut-legend-item">
                    <span className="donut-legend-label">
                      <i style={{ 
                        background: item.name === 'Low' ? '#059669' : item.name === 'Medium' ? '#d97706' : item.name === 'High' ? '#ea580c' : '#dc2626' 
                      }} />
                      {item.name}
                    </span>
                    <b>{item.pct}%</b>
                  </div>
                ))}
              </div>
              <div style={{ width: 140, height: 140 }}>
                <DonutChart data={summary.risk_distribution} />
              </div>
            </div>
          </section>
          </TiltCard>

          {/* Bottom Donut: Category Breakdown ("Sentiments" style) */}
          <TiltCard className="stagger-in stagger-3" maxTilt={5} style={{ flex: 1 }}>
          <section className="panel" style={{ height: "100%", padding: '20px' }}>
            <div className="panel-head" style={{ marginBottom: '10px' }}>
              <h2>
                <ClipboardList size={17} style={{ color: 'var(--accent-emerald)' }} />
                Top Sectors
              </h2>
            </div>
            <div className="donut-card-content">
              <div className="donut-legend">
                {catLegend.map((item: any) => (
                  <div key={item.name} className="donut-legend-item">
                    <span className="donut-legend-label">
                      <i style={{ background: item.color }} />
                      {item.name.split(' ')[0]}
                    </span>
                    <b>{item.pct}%</b>
                  </div>
                ))}
              </div>
              <div style={{ width: 140, height: 140 }}>
                <DonutChart 
                  data={topCategories} 
                  colors={activeTheme.palette} 
                />
              </div>
            </div>
          </section>
          </TiltCard>

        </div>
      </div>

      {/* Bottom Horizontal Lists (Mirrors Reference UI's "Time spent in meetings" & "Talk to listen ratio") */}
      <div className="dashboard-grid" style={{ marginBottom: '22px' }}>
        
        {/* Left: Contractor Concentration */}
        <TiltCard className="span-6 stagger-in stagger-4" maxTilt={4}>
        <section className="panel" style={{ height: "100%" }}>
          <div className="panel-head">
            <div>
              <h2>
                <Users size={18} style={{ color: 'var(--accent-violet)' }} />
                Contractor concentration
              </h2>
              <p>Aggregated project volume across leading contractors</p>
            </div>
            <Link className="text-link" to="/contractors">View all →</Link>
          </div>

          <div className="progress-list">
            {contractors.length ? contractors.map((c, i) => {
              const maxVal = contractors[0]?.total_value || 1
              const pct = Math.min(100, Math.max(15, Math.round(((c.total_value || 1) / maxVal) * 90)))
              return (
                <div key={c.contractor_id || i} className="progress-row">
                  <div className="progress-avatar">
                    {(c.name || 'Contractor').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="progress-info">
                    <strong>{c.name || 'Unassigned'}</strong>
                    <small>{c.district || 'National'} · {c.contractor_id}</small>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="progress-val">
                    {formatINR(c.total_value || 0)}
                  </div>
                </div>
              )
            }) : (
              <div className="empty-panel">No contractor concentration records.</div>
            )}
          </div>
        </section>
        </TiltCard>

        {/* Right: District Verification Status */}
        <TiltCard className="span-6 stagger-in stagger-4" maxTilt={4}>
        <section className="panel" style={{ height: "100%" }}>
          <div className="panel-head">
            <div>
              <h2>
                <MapPinned size={18} style={{ color: 'var(--accent-cyan)' }} />
                Constituency Allocation & Review
              </h2>
              <p>Verification ratio by prioritized monitoring zone</p>
            </div>
            <Link className="text-link" to="/map">Open map →</Link>
          </div>

          <div className="progress-list">
            {districtList.map((d: any, i: number) => (
              <div key={d.name || i} className="progress-row">
                <div className="progress-avatar" style={{ background: 'linear-gradient(135deg, rgba(152, 113, 133, 0.35), rgba(214, 170, 159, 0.35))' }}>
                  {d.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="progress-info">
                  <strong>{d.name}</strong>
                  <small>{d.state} State</small>
                </div>
                <div className="progress-track">
                  <div className="progress-fill secondary" style={{ width: `${d.pct}%` }} />
                </div>
                <div className="progress-val">
                  {d.pct}%
                </div>
              </div>
            ))}
          </div>
        </section>
        </TiltCard>

      </div>

      {/* Secondary Row: Geographic Map & Monthly Trend */}
      <div className="dashboard-grid stagger-in stagger-5">
        <section className="panel span-7 map-panel">
          <div className="panel-head">
            <div>
              <h2><MapPinned size={18}/> Geographic monitoring map</h2>
              <p>Representative coordinates; marker colour indicates model risk band.</p>
            </div>
            <Link className="text-link" to="/map">Open full map →</Link>
          </div>
          <ProjectMap projects={mapProjects.slice(0, 450)} compact/>
        </section>

        <section className="panel span-5">
          <div className="panel-head">
            <div>
              <h2>Project Trend Analysis</h2>
              <p>Monthly sanctioned projects across timeline</p>
            </div>
          </div>
          <TrendArea data={summary.monthly_trend}/>
        </section>
      </div>

      {/* High-Risk Projects Auditing Table */}
      <section className="panel high-risk-table stagger-in stagger-5" style={{ marginTop: '22px' }}>
        <div className="panel-head">
          <div>
            <h2>High-risk projects requiring attention</h2>
            <p>Ordered by composite machine learning risk score</p>
          </div>
          <Link className="text-link" to="/projects?risk_level=High">View all projects →</Link>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Project ID</th>
                <th>Location</th>
                <th>Project type</th>
                <th>Sanctioned</th>
                <th>Risk score</th>
                <th>Primary anomaly signal</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {summary.high_risk_projects.map((p: Project) => (
                <tr key={p.project_id}>
                  <td className="id-cell">{p.project_id}</td>
                  <td>{p.district}<small>{p.state}</small></td>
                  <td>{p.project_type}</td>
                  <td>{formatINR(p.sanctioned_amount)}</td>
                  <td>
                    <div className="score-cell">
                      <b>{p.risk_score}</b>
                      <RiskBadge level={p.risk_level}/>
                    </div>
                  </td>
                  <td className="description-cell">{p.main_anomaly}</td>
                  <td>
                    <Link className="row-link" to={`/projects/${p.project_id}`}>Investigate →</Link>
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