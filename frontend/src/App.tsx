import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AppLayout } from './components/UI'
import { ThemeProvider } from './context/ThemeContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import Alerts from './pages/Alerts'
import { Contractors, ContractorDetail } from './pages/Contractors'
import MapPage from './pages/MapPage'
import Investigations from './pages/Investigations'
import Investigation from './pages/Investigation'
import Reports from './pages/Reports'
import Methodology from './pages/Methodology'
import Settings from './pages/Settings'

export default function App() {
  const [user, setUser] = useState<any>(() => {
    try {
      const stored = localStorage.getItem('mplad_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const location = useLocation()

  useEffect(() => {
    try {
      const stored = localStorage.getItem('mplad_user')
      if (stored && !user) {
        setUser(JSON.parse(stored))
      }
    } catch {
      // Ignore parse errors
    }
  }, [location.pathname, user])

  const handleLogin = (newUser: any) => {
    setUser(newUser)
  }

  // If user is not authenticated, render Login on root or redirect from protected routes
  if (!user) {
    return (
      <ThemeProvider>
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="*" element={<Login onLogin={handleLogin} />} />
        </Routes>
      </ThemeProvider>
    )
  }

  // If user is authenticated, wrap with AppLayout and render protected pages
  return (
    <ThemeProvider>
      <AppLayout user={user}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:projectId" element={<Investigation />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/contractors" element={<Contractors />} />
          <Route path="/contractors/:contractorId" element={<ContractorDetail />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/investigations" element={<Investigations />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/methodology" element={<Methodology />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppLayout>
    </ThemeProvider>
  )
}
