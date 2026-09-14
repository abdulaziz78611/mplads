import { Link } from 'react-router-dom'

const color: Record<string, string> = {
  contractor: '#155a8a',
  district: '#2f8f83',
  agency: '#7a6e9b',
  project: '#c47c34',
}

export function NetworkGraph({ data }: { data: any }) {
  if (!data?.nodes?.length) {
    return <div className="empty-panel">No relationship network is available for this project.</div>
  }
  const nodes = (data.nodes || []).slice(0, 18)
  const positions = nodes.map((node: any, i: number) => {
    const special =
      node.type === 'contractor'
        ? { x: 50, y: 15 }
        : node.type === 'district'
        ? { x: 17, y: 79 }
        : node.type === 'agency'
        ? { x: 83, y: 79 }
        : { x: 15 + ((i * 19) % 70), y: 39 + ((i * 23) % 22) }
    return { ...node, ...special }
  })
  const lookup = Object.fromEntries(positions.map((n: any) => [n.id, n]))
  const edges = data.edges || []

  return (
    <div className="network-wrap">
      <div className="network-graph">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {edges.map((edge: any, i: number) => {
            const a = lookup[edge.source]
            const b = lookup[edge.target]
            return a && b ? <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} /> : null
          })}
        </svg>
        {positions.map((node: any) => (
          <div
            className={`network-node ${node.type}`}
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              backgroundColor: color[node.type] || '#155a8a',
            }}
            title={node.label || ''}
            key={node.id}
          >
            {node.type === 'project' ? (
              <Link to={`/projects/${node.label}`}>
                {(node.label || '').replace('MPLAD-', '')}
              </Link>
            ) : (
              <span>
                {(node.label || '').length > 19
                  ? `${(node.label || '').slice(0, 17)}…`
                  : node.label || ''}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="network-summary">
        <span>
          <i className="dot contractor" /> Contractor
        </span>
        <span>
          <i className="dot district" /> District
        </span>
        <span>
          <i className="dot agency" /> Agency
        </span>
        <span>
          <i className="dot project" /> Project
        </span>
        <p>
          {data.summary?.contractor_projects || 0} contractor-linked projects across{' '}
          {data.summary?.districts || 0} districts and {data.summary?.agencies || 0} agencies.
        </p>
      </div>
    </div>
  )
}
