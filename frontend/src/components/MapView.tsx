import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import { Link } from 'react-router-dom'
import type { Project, RiskLevel } from '../services/api'
import { formatINR } from '../services/api'
import { RiskBadge } from './UI'

const colors: Record<RiskLevel, string> = { Low: '#2c8a67', Medium: '#c9902c', High: '#d06937', Critical: '#b84555' }

export function ProjectMap({ projects, compact = false }: { projects: Project[]; compact?: boolean }) {
  return <div className={`map-frame ${compact ? 'map-compact' : ''}`}>
    <MapContainer center={[22.6, 79.2]} zoom={4.45} scrollWheelZoom={!compact} minZoom={4} maxBounds={[[5, 64], [40, 101]]}>
      <TileLayer attribution='© OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {projects.filter(p => p.latitude != null && p.longitude != null && Number.isFinite(p.latitude) && Number.isFinite(p.longitude)).map(project => <CircleMarker key={project.project_id} center={[project.latitude!, project.longitude!]} radius={Math.max(4, Math.min(9, 3 + project.risk_score / 18))} pathOptions={{ color: '#fff', weight: 1.5, fillColor: colors[project.risk_level], fillOpacity: .82 }}>
        <Popup><div className="map-popup"><strong>{project.project_id}</strong><span>{project.project_type}</span><span>{project.district}, {project.state}</span><b>{formatINR(project.sanctioned_amount)}</b><RiskBadge level={project.risk_level}/><Link to={`/projects/${project.project_id}`}>Investigate project →</Link></div></Popup>
      </CircleMarker>)}
    </MapContainer>
    <div className="map-legend">{(['Low', 'Medium', 'High', 'Critical'] as RiskLevel[]).map(x => <span key={x}><i style={{ background: colors[x] }} />{x}</span>)}</div>
  </div>
}
