import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, LogOut, Building2, ChevronRight, CheckCircle2 } from 'lucide-react'
import ProgressBar from '../components/ProgressBar'

interface Clinic {
  id: string
  name: string
  email_contact: string
  progress: number
  tasks_complete: number
  tasks_total: number
  created_at: string
}

interface Props { user: { name: string; email: string } }

export default function AdminDashboard({ user }: Props) {
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', email_contact: '', keycloak_username: '' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const nav = useNavigate()

  const load = () => {
    fetch('/api/admin/clinics')
      .then(r => r.json())
      .then(setClinics)
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const createClinic = async () => {
    setCreating(true)
    setCreateError('')
    try {
      const r = await fetch('/api/admin/clinics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (r.ok) {
        setShowCreate(false)
        setForm({ name: '', email_contact: '', keycloak_username: '' })
        load()
      } else {
        const body = await r.json().catch(() => ({}))
        setCreateError(body.detail || `Error ${r.status} — please try again`)
      }
    } catch (e) {
      setCreateError('Network error — could not reach the server')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🦷</span>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">123Dentist Partner Onboarding</h1>
              <p className="text-xs text-gray-500">Admin Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.name || user.email}</span>
            <a href="/auth/logout" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
              <LogOut className="w-4 h-4" />
              Sign out
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Clinic Partners</h2>
            <p className="text-sm text-gray-500 mt-0.5">{clinics.length} clinics in onboarding</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Clinic
          </button>
        </div>

        {/* Create modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-semibold mb-4">New Clinic Partner</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Clinic Name</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Sunshine Dental" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Contact Email</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    type="email" placeholder="dr.smith@clinic.com" value={form.email_contact} onChange={e => setForm(f => ({ ...f, email_contact: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Keycloak Username <span className="text-gray-400 font-normal">(for portal login)</span></label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="clinic-sunshine" value={form.keycloak_username} onChange={e => setForm(f => ({ ...f, keycloak_username: e.target.value }))} />
                </div>
              </div>
              {createError && (
                <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{createError}</p>
              )}
              <div className="flex gap-3 mt-4">
                <button onClick={() => { setShowCreate(false); setCreateError('') }} className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button onClick={createClinic} disabled={!form.name || !form.email_contact || creating}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create Clinic'}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : clinics.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No clinics yet. Add your first clinic partner.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {clinics.map(c => (
              <button
                key={c.id}
                onClick={() => nav(`/admin/clinics/${c.id}`)}
                className="bg-white border border-gray-200 rounded-xl p-5 text-left hover:border-blue-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{c.name}</h3>
                      {c.progress === 100 && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    </div>
                    <p className="text-sm text-gray-500">{c.email_contact}</p>
                    <div className="mt-3">
                      <ProgressBar pct={c.progress} complete={c.tasks_complete} total={c.tasks_total} />
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors mt-1 shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
