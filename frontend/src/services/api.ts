const getApiBase = () => {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname || 'localhost'
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'
    if (isLocalhost) {
      return envUrl || `http://${hostname}:8000/api`
    }
    // On production domains (e.g. Vercel), if envUrl is set to a real remote HTTPS url use it, otherwise use same-origin /api
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      return envUrl
    }
    return '/api'
  }
  return envUrl || 'http://localhost:8000/api'
}
const API_BASE = getApiBase()

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical'

export type Project = {
  project_id: string
  state: string
  district: string
  constituency_id: string
  project_type: string
  location: string
  contractor_id: string
  contractor_name: string
  sanctioned_amount: number
  released_amount?: number
  expenditure: number
  status: string
  latitude: number | null
  longitude: number | null
  risk_score: number
  risk_level: RiskLevel
  data_source?: string
  source_record_id?: string
  source_url?: string
  import_batch_id?: string
  imported_at?: string
  data_quality_status?: string
  [key: string]: any
}

export const getActiveDataSource = (): string => {
  if (typeof window === 'undefined') return 'official'
  return localStorage.getItem('mplad_data_source') || 'official'
}

export const setActiveDataSource = (source: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('mplad_data_source', source)
    window.dispatchEvent(new CustomEvent('mplad-datasource-changed', { detail: source }))
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.detail || `Request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

export const api = {
  login: (email: string, password: string) =>
    request<any>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  summary: (filters = '') => {
    const ds = getActiveDataSource()
    const sep = filters.includes('?') ? '&' : '?'
    const dsParam = ds && ds !== 'all' ? `${sep}data_source=${ds}` : ''
    return request<any>(`/dashboard/summary${filters}${dsParam}`)
  },

  options: (params = '') => {
    const ds = getActiveDataSource()
    const sep = params.includes('?') ? '&' : '?'
    const dsParam = ds && ds !== 'all' ? `${sep}data_source=${ds}` : ''
    return request<any>(`/filter-options${params}${dsParam}`)
  },

  projects: (params = '') => {
    const ds = getActiveDataSource()
    const sep = params.includes('?') ? '&' : '?'
    const dsParam = ds && ds !== 'all' ? `${sep}data_source=${ds}` : ''
    return request<{ items: Project[]; total: number; page: number; pages: number }>(`/projects${params}${dsParam}`)
  },

  project: (id: string) => request<any>(`/projects/${encodeURIComponent(id)}`),
  projectNetwork: (id: string) => request<any>(`/projects/${encodeURIComponent(id)}/network`),

  contractors: (params = '') => {
    const ds = getActiveDataSource()
    const sep = params.includes('?') ? '&' : '?'
    const dsParam = ds && ds !== 'all' ? `${sep}data_source=${ds}` : ''
    return request<any[]>(`/contractors${params}${dsParam}`)
  },

  contractor: (id: string) => request<any>(`/contractors/${encodeURIComponent(id)}`),

  alerts: (params = '') => {
    const ds = getActiveDataSource()
    const sep = params.includes('?') ? '&' : '?'
    const dsParam = ds && ds !== 'all' ? `${sep}data_source=${ds}` : ''
    return request<any>(`/alerts${params}${dsParam}`)
  },

  updateAlert: (id: string, status: string) =>
    request<any>(`/alerts/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  mapProjects: (params = '') => {
    const ds = getActiveDataSource()
    const sep = params.includes('?') ? '&' : '?'
    const dsParam = ds && ds !== 'all' ? `${sep}data_source=${ds}` : ''
    return request<Project[]>(`/map/projects${params}${dsParam}`)
  },

  investigations: (params = '') => {
    const ds = getActiveDataSource()
    const sep = params.includes('?') ? '&' : '?'
    const dsParam = ds && ds !== 'all' ? `${sep}data_source=${ds}` : ''
    return request<any[]>(`/investigations${params}${dsParam}`)
  },

  createInvestigation: (payload: any) =>
    request<any>('/investigations', { method: 'POST', body: JSON.stringify(payload) }),

  updateInvestigation: (id: number, payload: any) =>
    request<any>(`/investigations/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  report: (id: string) => request<any>(`/reports/${encodeURIComponent(id)}`),

  rerunAnalysis: (dataSource?: string) => {
    const ds = dataSource || getActiveDataSource()
    const query = ds && ds !== 'all' ? `?data_source=${ds}` : ''
    return request<any>(`/anomaly/run${query}`, { method: 'POST' })
  },

  dataQuality: (source?: string) => {
    const ds = source || getActiveDataSource()
    const query = ds && ds !== 'all' ? `?data_source=${ds}` : ''
    return request<any>(`/data/quality${query}`)
  },
  importBatches: () => request<any[]>('/data/batches'),

  importData: async (formDataOrJson: FormData | object, dataSource = 'official', sourceName = 'MoSPI eSAKSHI Official Portal') => {
    if (formDataOrJson instanceof FormData) {
      const response = await fetch(`${API_BASE}/data/import?data_source=${encodeURIComponent(dataSource)}&source_name=${encodeURIComponent(sourceName)}`, {
        method: 'POST',
        body: formDataOrJson,
      })
      if (!response.ok) {
        const p = await response.json().catch(() => ({}))
        throw new Error(p.detail || 'Data import failed')
      }
      return response.json()
    } else {
      return request<any>(`/data/import?data_source=${encodeURIComponent(dataSource)}&source_name=${encodeURIComponent(sourceName)}`, {
        method: 'POST',
        body: JSON.stringify(formDataOrJson),
      })
    }
  },

  seedOfficial: () => request<any>('/data/seed-official', { method: 'POST' }),
}

export const formatINR = (amount = 0) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)

export const formatDate = (value?: string) =>
  value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value)) : '—'
