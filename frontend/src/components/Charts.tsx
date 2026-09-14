import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart, Area, AreaChart, CartesianGrid } from 'recharts'
import { formatINR } from '../services/api'
import { useActiveTheme } from '../context/ThemeContext'

export const neonPalette = [
  '#1b6a55', 
  '#2d8870', 
  '#41a98e', 
  '#0d5241', 
  '#5bc4a9', 
  '#78d4bd', 
  '#163832', 
  '#082a20'
]

export const riskColors: Record<string, string> = { 
  Low: '#059669', 
  Medium: '#d97706', 
  High: '#ea580c', 
  Critical: '#dc2626' 
}

const lightTooltipStyle = {
  background: 'rgba(255, 255, 255, 0.96)',
  border: '1px solid rgba(0, 0, 0, 0.08)',
  borderRadius: '12px',
  color: '#0f172a',
  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.1)',
  fontSize: '12px',
  padding: '8px 12px',
}

export function GeneralStatsBar({ data, dataKey = 'projects', unit = '' }: { data: any[]; dataKey?: string; unit?: string }) {
  const { activeTheme } = useActiveTheme()
  if (!data || data.length === 0) return null
  
  let maxIdx = 0
  let maxVal = -1
  data.forEach((d, idx) => {
    const v = Number(d[dataKey] || d.value || 0)
    if (v > maxVal) {
      maxVal = v
      maxIdx = idx
    }
  })

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="rgba(0, 0, 0, 0.06)" />
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 11, fill: activeTheme.secondary }} 
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 10, fill: activeTheme.highlight }} 
        />
        <Tooltip 
          contentStyle={{
            ...lightTooltipStyle,
            color: '#0f172a',
            border: `1px solid ${activeTheme.primary}33`
          }}
          cursor={{ fill: 'rgba(0, 0, 0, 0.03)' }}
          formatter={(v: any) => [unit ? `${v} ${unit}` : v, 'Total']}
        />
        <Bar 
          dataKey={dataKey} 
          barSize={12} 
          radius={[6, 6, 6, 6]}
        >
          {data.map((_, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={index === maxIdx ? activeTheme.primary : `${activeTheme.secondary}66`} 
              style={{
                filter: index === maxIdx ? `drop-shadow(0 0 6px ${activeTheme.primary}66)` : 'none',
                transition: 'all 1.2s ease'
              }}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function DonutChart({ data, colors }: { data: any[]; colors?: string[] }) {
  const { activeTheme } = useActiveTheme()
  if (!data || data.length === 0) return null
  const palette = colors || activeTheme.palette

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie 
          data={data} 
          dataKey="value" 
          nameKey="name" 
          innerRadius={48} 
          outerRadius={70} 
          paddingAngle={4}
          stroke="none"
        >
          {data.map((entry, i) => (
            <Cell 
              key={i} 
              fill={riskColors[entry.name] || palette[i % palette.length]} 
              style={{ 
                filter: `drop-shadow(0 2px 4px ${riskColors[entry.name] || palette[i % palette.length]}33)`,
                transition: 'fill 1.2s ease'
              }}
            />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{
            ...lightTooltipStyle,
            color: '#0f172a',
            border: `1px solid ${activeTheme.primary}33`
          }} 
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function StateBar({ data }: { data: any[] }) { 
  const { activeTheme } = useActiveTheme()
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 18 }}>
        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: activeTheme.secondary }}/>
        <YAxis width={95} type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: activeTheme.highlight }}/>
        <Tooltip 
          contentStyle={{
            ...lightTooltipStyle,
            color: '#0f172a',
            border: `1px solid ${activeTheme.primary}33`
          }} 
          cursor={{ fill: 'rgba(0, 0, 0, 0.03)' }}
        />
        <Bar dataKey="value" fill={activeTheme.primary} radius={[0, 6, 6, 0]} barSize={14} style={{ transition: 'fill 1.2s ease' }}/>
      </BarChart>
    </ResponsiveContainer>
  ) 
}

export function RiskPie({ data }: { data: any[] }) { 
  const { activeTheme } = useActiveTheme()
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={4} stroke="none">
          {data.map((d, i) => (
            <Cell 
              key={i} 
              fill={riskColors[d.name] || activeTheme.palette[i % activeTheme.palette.length]} 
            />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{
            ...lightTooltipStyle,
            color: '#0f172a',
            border: `1px solid ${activeTheme.primary}33`
          }}
        />
        <Legend 
          iconType="circle" 
          iconSize={8} 
          wrapperStyle={{ fontSize: '11px', color: '#0f172a' }}
        />
      </PieChart>
    </ResponsiveContainer>
  ) 
}

export function TrendArea({ data }: { data: any[] }) { 
  const { activeTheme } = useActiveTheme()
  return (
    <ResponsiveContainer width="100%" height={245}>
      <AreaChart data={data} margin={{ left: 8, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor={activeTheme.secondary} stopOpacity={0.4}/>
            <stop offset="95%" stopColor={activeTheme.primary} stopOpacity={0.03}/>
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="rgba(0, 0, 0, 0.06)"/>
        <XAxis dataKey="month" tickFormatter={x => x.slice(5)} tick={{ fontSize: 11, fill: activeTheme.secondary }} axisLine={false} tickLine={false}/>
        <YAxis hide/>
        <Tooltip 
          contentStyle={{
            ...lightTooltipStyle,
            color: '#0f172a',
            border: `1px solid ${activeTheme.primary}33`
          }} 
          formatter={(x: any) => [x, 'Projects']}
        />
        <Area type="monotone" dataKey="projects" stroke={activeTheme.primary} strokeWidth={2.5} fill="url(#trendFill)"/>
      </AreaChart>
    </ResponsiveContainer>
  ) 
}

export function TypeBar({ data }: { data: any[] }) { 
  const { activeTheme } = useActiveTheme()
  return (
    <ResponsiveContainer width="100%" height={245}>
      <BarChart data={data.slice(0, 6)} margin={{ left: -22, right: 4 }}>
        <XAxis dataKey="name" tickFormatter={x => x.split(' ')[0]} tick={{ fontSize: 10, fill: activeTheme.secondary }} axisLine={false} tickLine={false}/>
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: activeTheme.highlight }}/>
        <Tooltip 
          contentStyle={{
            ...lightTooltipStyle,
            color: '#0f172a',
            border: `1px solid ${activeTheme.primary}33`
          }}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={16}>
          {data.map((_, i) => (
            <Cell key={i} fill={activeTheme.palette[i % activeTheme.palette.length]} style={{ transition: 'fill 1.2s ease' }} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  ) 
}

export function ContractorTimeline({ data }: { data: any[] }) { 
  const { activeTheme } = useActiveTheme()
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="contractorFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor={activeTheme.primary} stopOpacity={0.35}/>
            <stop offset="95%" stopColor={activeTheme.secondary} stopOpacity={0.02}/>
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="rgba(0, 0, 0, 0.06)"/>
        <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: activeTheme.secondary }}/>
        <YAxis axisLine={false} tickLine={false} tick={{ fill: activeTheme.highlight }}/>
        <Tooltip 
          contentStyle={{
            ...lightTooltipStyle,
            color: '#0f172a',
            border: `1px solid ${activeTheme.primary}33`
          }} 
          formatter={(v: any, name: any) => [name === 'value' ? formatINR(v) : v, name === 'value' ? 'Value' : 'Projects']}
        />
        <Area dataKey="projects" type="monotone" stroke={activeTheme.primary} strokeWidth={2.5} fill="url(#contractorFill)"/>
      </AreaChart>
    </ResponsiveContainer>
  ) 
}
