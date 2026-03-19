import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AdminDashboard from './views/AdminDashboard'
import AdminClinic from './views/AdminClinic'
import ClinicPortal from './views/ClinicPortal'

interface User {
  sub: string
  preferred_username: string
  email: string
  name: string
  role: string
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => { setUser(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#1e3a4f] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#6b7a8d] text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    window.location.href = '/auth/login'
    return null
  }

  const isAdmin = user.role === 'internal_admin' || user.role === 'admin'

  return (
    <BrowserRouter>
      <Routes>
        {isAdmin ? (
          <>
            <Route path="/" element={<AdminDashboard user={user} />} />
            <Route path="/admin/clinics/:clinicId" element={<AdminClinic user={user} />} />
            <Route path="/portal/:clinicId" element={<ClinicPortal user={user} adminPreview />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        ) : (
          <>
            <Route path="/" element={<ClinicPortal user={user} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  )
}
