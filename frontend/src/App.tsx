import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AdminDashboard from './views/AdminDashboard'
import AdminClinic from './views/AdminClinic'
import ClinicPortal from './views/ClinicPortal'
import Login from './views/Login'

interface User {
  username: string
  email: string
  role: string
  clinic_id: string | null
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMe = () =>
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => { setUser(data); setLoading(false) })
      .catch(() => setLoading(false))

  useEffect(() => { fetchMe() }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-[#1e3a4f] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={() => fetchMe()} />
  }

  const isAdmin = user.role === 'admin' || user.role === 'internal_admin'

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
