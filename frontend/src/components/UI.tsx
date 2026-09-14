import { FloatingMeshGlow, FluidCursorGlow, SkeletonCard } from './Animations'
import { AlertTriangle, Bell, ChevronDown, ClipboardCheck, LayoutDashboard, LogOut, Map, Network, Search, Settings, ShieldAlert, Users, FileText, FlaskConical, SlidersHorizontal, ArrowLeft } from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef, type ReactNode } from 'react'
import { api, getActiveDataSource, setActiveDataSource, type RiskLevel } from '../services/api'

export const riskClass = (risk: RiskLevel | string) => `risk-badge risk-${risk.toLowerCase()}`

export function RiskBadge({ level }: { level: RiskLevel | string }) { 
  return <span className={riskClass(level)}>{level}</span> 
}

export function DataSourceBadge({ source }: { source?: string }) {
  if (source === 'official') {
    return (
      <span
        className="badge"
        style={{
          background: 'rgba(16, 185, 129, 0.12)',
          color: '#065f46',
          border: '1px solid rgba(16, 185, 129, 0.28)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: '6px',
          fontSize: '0.75rem',
        }}
        title="Official Data Pipeline — 180 schema-conforming validation records based on MoSPI/eSAKSHI data structure"
      >
        <span>📋</span> Schema Validation
      </span>
    )
  }
  return (
    <span
      className="badge"
      style={{
        background: 'rgba(99, 102, 241, 0.12)',
        color: '#3730a3',
        border: '1px solid rgba(99, 102, 241, 0.28)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: '6px',
        fontSize: '0.75rem',
      }}
      title="Calibrated Synthetic Benchmark Showcase Record"
    >
      <span>🧪</span> Demo Showcase
    </span>
  )
}

export function PageLoader({ label = 'Loading intelligence data…' }: { label?: string }) { 
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-secondary)', fontSize: 13 }}>
        <span className="spinner" />
        <span>{label}</span>
      </div>
      <div className="dashboard-grid">
        <div className="span-8"><SkeletonCard height={240} /></div>
        <div className="span-4" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <SkeletonCard height={110} />
          <SkeletonCard height={110} />
        </div>
      </div>
    </div>
  )
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) { 
  return (
    <div className="error-state">
      <AlertTriangle size={22}/>
      <div>
        <strong>Data unavailable</strong>
        <p>{message}</p>
      </div>
      {retry && <button className="btn secondary" onClick={retry}>Try again</button>}
    </div>
  ) 
}

const navigation = [
  ['/dashboard', 'Dashboard', LayoutDashboard],
  ['/projects', 'Projects', Search],
  ['/alerts', 'Alerts', ShieldAlert],
  ['/contractors', 'Contractors', Users],
  ['/map', 'GIS Map', Map],
  ['/investigations', 'Investigations', ClipboardCheck],
  ['/reports', 'Reports', FileText],
  ['/methodology', 'Methodology', FlaskConical],
  ['/settings', 'Settings', Settings],
] as const

export function AppLayout({ children, user }: { children: ReactNode; user: any }) {
  const navigate = useNavigate()
  const [openNotifications, setOpenNotifications] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unread, setUnread] = useState(true)
  const [dataSource, setDataSource] = useState<string>(getActiveDataSource())
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: any) => {
      setDataSource(e.detail || getActiveDataSource())
    }
    window.addEventListener('mplad-datasource-changed', handler)
    return () => window.removeEventListener('mplad-datasource-changed', handler)
  }, [])

  const handleDataSourceChange = (newSource: string) => {
    setDataSource(newSource)
    setActiveDataSource(newSource)
  }

  useEffect(() => {
    api.alerts('?page_size=6').then(data => {
      if (data?.items) setNotifications(data.items)
    }).catch(() => {})
  }, [dataSource])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setOpenNotifications(false)
      }
    }
    if (openNotifications) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openNotifications])

  const logout = () => { 
    localStorage.removeItem('mplad_user')
    localStorage.removeItem('mplad_token')
    navigate('/') 
  }

  const initials = user?.name ? user.name.split(' ').map((x: string) => x[0]).join('').slice(0, 2) : 'SL'

  return (
    <div className="app-shell">
      {/* Animated Colorful Mesh Orbs & Fluid Glow */}
      <FloatingMeshGlow />
      <FluidCursorGlow />

      {/* Floating Vertical Capsule Dock */}
      <aside className="sidebar">
        <Link to="/dashboard" className="brand" title="MPLAD Sentinel Platform">
          <div className="brand-mark">
            <Network size={22}/>
          </div>
        </Link>
        <nav>
          {navigation.map(([to, label, Icon]) => (
            <NavLink 
              key={to} 
              to={to} 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={20}/>
              <span className="nav-tooltip">{label}</span>
              {label === 'Alerts' && <span className="nav-count" />}
            </NavLink>
          ))}
        </nav>
        <button className="logout-dock" onClick={logout} title="Sign out">
          <LogOut size={19}/>
          <span className="nav-tooltip">Sign out</span>
        </button>
      </aside>

      {/* Main Glassmorphic Window */}
      <main className="main-content">
        <header className="topbar">
          <div className="top-search">
            <Search size={17}/>
            <input 
              aria-label="Global search" 
              placeholder="Find any project, contractor, anomaly..." 
              onKeyDown={e => { 
                if (e.key === 'Enter' && e.currentTarget.value) {
                  navigate(`/projects?search=${encodeURIComponent(e.currentTarget.value)}`) 
                }
              }} 
            />
          </div>

          {/* Dual Data Source Mode Switcher: Exactly Two Separated Modes */}
          <div className="datasource-switcher" role="radiogroup" aria-label="Dataset Mode">
            <button
              type="button"
              className={`ds-pill ${dataSource === 'official' ? 'active official' : ''}`}
              onClick={() => handleDataSourceChange('official')}
              title="Mode 1: Official Data Pipeline — 180 schema-conforming validation records based on the MoSPI/eSAKSHI data structure"
            >
              <span className="ds-dot official-dot" />
              <span className="ds-label">🏛️ MoSPI / eSAKSHI</span>
              <span className="ds-sub">Schema Validation (180)</span>
            </button>
            <button
              type="button"
              className={`ds-pill ${dataSource === 'synthetic' ? 'active demo' : ''}`}
              onClick={() => handleDataSourceChange('synthetic')}
              title="Mode 2: Demonstration Dataset — 1,202 calibrated synthetic showcase records"
            >
              <span className="ds-dot demo-dot" />
              <span className="ds-label">🧪 Demo Showcase</span>
              <span className="ds-sub">Synthetic Benchmark (1,202)</span>
            </button>
          </div>

          <div className="top-actions">
            <div className="notification-wrapper" ref={notifRef}>
              <button
                className={`icon-button ${openNotifications ? 'active' : ''}`}
                aria-label="Notifications"
                title="System Notifications & Alerts"
                onClick={() => setOpenNotifications(!openNotifications)}
              >
                <Bell size={18}/>
                {unread && <i />}
              </button>

              {openNotifications && (
                <div className="notifications-dropdown">
                  <div className="notifications-header">
                    <div>
                      <strong>System Alerts</strong>
                      <small>{notifications.length} high-priority signals</small>
                    </div>
                    {unread && (
                      <button className="btn-text" onClick={() => setUnread(false)}>
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="notifications-list">
                    {notifications.length ? notifications.map((n: any) => (
                      <div
                        key={n.alert_id}
                        className="notification-item"
                        onClick={() => {
                          setOpenNotifications(false)
                          navigate(`/projects/${n.project_id}`)
                        }}
                      >
                        <div className="notification-icon">
                          <ShieldAlert size={16} />
                        </div>
                        <div className="notification-body">
                          <div className="notification-title">
                            <b>{n.alert_type}</b>
                            <RiskBadge level={n.severity} />
                          </div>
                          <p>{n.description}</p>
                          <div className="notification-meta">
                            <span>{n.project_id}</span> · <span>{n.district}, {n.state}</span>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="notifications-empty">No active notifications</div>
                    )}
                  </div>
                  <div className="notifications-footer">
                    <Link
                      to="/alerts"
                      onClick={() => setOpenNotifications(false)}
                    >
                      View all alerts & audit log →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="user-chip">
              <div className="avatar">{initials}</div>
              <div>
                <b>{user?.name || 'Sarah Lee'}</b>
                <span>{user?.email || 'sarah@mplad-audit.gov'}</span>
              </div>
              <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }}/>
            </div>
          </div>
        </header>

        <section className="page-wrap"><div className="page-transition">{children}</div></section>
      </main>
    </div>
  )
}

export function PageHeading({ 
  eyebrow, 
  title, 
  description, 
  action 
}: { 
  eyebrow?: string; 
  title: string; 
  description?: string; 
  action?: ReactNode 
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="kinetic-text">{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="heading-action">{action}</div>}
    </div>
  )
}

export function Notice({ children }: { children: ReactNode }) { 
  return (
    <div className="notice">
      <AlertTriangle size={17}/>
      <span>{children}</span>
    </div>
  ) 
}

export const Select = ({ 
  value, 
  onChange, 
  options, 
  label = 'All' 
}: { 
  value: string; 
  onChange: (x: string) => void; 
  options: string[]; 
  label?: string 
}) => (
  <select value={value} onChange={e => onChange(e.target.value)}>
    <option value="">{label}</option>
    {options.map(x => <option value={x} key={x}>{x}</option>)}
  </select>
)

export function FilterToggle({ children }: { children: ReactNode }) { 
  return (
    <div className="filter-toggle">
      <SlidersHorizontal size={16}/>
      {children}
    </div>
  ) 
}