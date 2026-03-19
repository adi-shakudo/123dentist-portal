import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, LogOut, Building2, ChevronRight, CheckCircle2, Trash2, AlertTriangle } from 'lucide-react'
import ProgressBar from '../components/ProgressBar'

interface Clinic {
  id: string
  name: string
  email_contact: string
  username: string | null
  progress: number
  tasks_complete: number
  tasks_total: number
  created_at: string
}

interface Props { user: { username: string; email: string } }

export default function AdminDashboard({ user }: Props) {
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', email_contact: '' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createdUsername, setCreatedUsername] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Clinic | null>(null)
  const [deleting, setDeleting] = useState(false)
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
    setCreatedUsername(null)
    try {
      const r = await fetch('/api/admin/clinics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (r.ok) {
        const data = await r.json()
        setCreatedUsername(data.username || null)
        setForm({ name: '', email_contact: '' })
        load()
      } else {
        const body = await r.json().catch(() => ({}))
        setCreateError(body.detail || `Error ${r.status} — please try again`)
      }
    } catch {
      setCreateError('Network error — could not reach the server')
    } finally {
      setCreating(false)
    }
  }

  const deleteClinic = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const r = await fetch(`/api/admin/clinics/${deleteTarget.id}`, { method: 'DELETE' })
      if (r.ok) {
        setDeleteTarget(null)
        load()
      }
    } catch {}
    setDeleting(false)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="flex h-screen w-64 flex-col bg-[#1e3a4f] text-white shrink-0">
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTyAGrj-_mCPA_rC69bx9PkCJ4hD-gPcuNI0Q&s"
              alt="123Dentist"
              className="h-full w-full object-contain p-0.5"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold leading-tight tracking-tight text-white">
              123Dentist Onboarding
            </span>
            <span className="text-[10px] text-white/50">
              Partner Portal
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium bg-[#284d65] text-white">
              <Building2 className="h-4 w-4 shrink-0" />
              Clinics
            </div>
          </div>
        </nav>

        <div className="border-t border-white/10 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] text-white/40">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              System Online
            </div>
            <a onClick={() => fetch("/api/auth/logout", {method:"POST"}).then(() => window.location.href="/")} href="#" className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70 transition-colors">
              <LogOut className="w-3 h-3" />
              Sign out
            </a>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header strip */}
        <header className="flex h-16 items-center justify-between border-b border-[#dde4ed] bg-white px-8 shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1a2a38]">Clinic Partners</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#6b7a8d]">{user.name || user.email}</span>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-[#1e3a4f] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#284d65] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Clinic
            </button>
          </div>
        </header>

        {/* Scrollable content area */}
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <p className="text-sm text-[#6b7a8d] mb-5">{clinics.length} clinics in onboarding</p>

          {/* Create modal */}
          {showCreate && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                {createdUsername ? (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-[#1a2a38]">Clinic Created</h3>
                    </div>
                    <p className="text-sm text-[#6b7a8d] mb-4">
                      Credentials have been emailed to the clinic. Their login details:
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4 border border-[#dde4ed] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[#6b7a8d] uppercase tracking-wide">Username</span>
                        <span className="text-sm font-mono font-semibold text-[#1a2a38]">{createdUsername}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[#6b7a8d] uppercase tracking-wide">Password</span>
                        <span className="text-sm text-[#6b7a8d]">sent via email</span>
                      </div>
                    </div>
                    <button onClick={() => { setShowCreate(false); setCreatedUsername(null) }}
                      className="w-full mt-5 bg-[#1e3a4f] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#284d65] transition-colors">
                      Done
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-[#1a2a38] mb-4">New Clinic Partner</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-medium text-[#6b7a8d] uppercase tracking-wide block mb-1.5">Clinic Name</label>
                        <input className="w-full border border-[#dde4ed] rounded-lg px-3 py-2 text-sm text-[#1a2a38] focus:outline-none focus:ring-2 focus:ring-[#2e8fb5] focus:border-transparent"
                          placeholder="e.g. Sunshine Dental" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                        {form.name && (
                          <p className="text-xs text-[#6b7a8d] mt-1.5">
                            Portal username: <span className="font-mono text-[#1e3a4f]">{form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}</span>
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-medium text-[#6b7a8d] uppercase tracking-wide block mb-1.5">Contact Email</label>
                        <input className="w-full border border-[#dde4ed] rounded-lg px-3 py-2 text-sm text-[#1a2a38] focus:outline-none focus:ring-2 focus:ring-[#2e8fb5] focus:border-transparent"
                          type="email" placeholder="dr.smith@clinic.com" value={form.email_contact} onChange={e => setForm(f => ({ ...f, email_contact: e.target.value }))} />
                        <p className="text-xs text-[#6b7a8d] mt-1.5">Login credentials will be sent to this address.</p>
                      </div>
                    </div>
                    {createError && (
                      <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{createError}</p>
                    )}
                    <div className="flex gap-3 mt-5">
                      <button onClick={() => { setShowCreate(false); setCreateError('') }}
                        className="flex-1 border border-[#dde4ed] text-[#6b7a8d] px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                        Cancel
                      </button>
                      <button onClick={createClinic} disabled={!form.name || !form.email_contact || creating}
                        className="flex-1 bg-[#1e3a4f] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#284d65] disabled:opacity-50 transition-colors">
                        {creating ? 'Creating...' : 'Create Clinic'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-[#1e3a4f] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : clinics.length === 0 ? (
            <div className="text-center py-20 text-[#6b7a8d]">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No clinics yet. Add your first clinic partner.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {clinics.map(c => (
                <div key={c.id} className="bg-white border border-[#dde4ed] rounded-xl p-5 hover:shadow-md transition-all group flex items-start gap-4">
                  <button
                    onClick={() => nav(`/admin/clinics/${c.id}`)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[#1a2a38]">{c.name}</h3>
                      {c.progress === 100 && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <p className="text-sm text-[#6b7a8d]">{c.email_contact}</p>
                    {c.username && <p className="text-xs text-[#6b7a8d]/60 mt-0.5 font-mono">@{c.username}</p>}
                    <div className="mt-3">
                      <ProgressBar pct={c.progress} complete={c.tasks_complete} total={c.tasks_total} />
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0 mt-1">
                    <ChevronRight
                      onClick={() => nav(`/admin/clinics/${c.id}`)}
                      className="w-5 h-5 text-[#6b7a8d] group-hover:text-[#2e8fb5] transition-colors cursor-pointer"
                    />
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteTarget(c) }}
                      className="p-1.5 rounded-lg text-[#6b7a8d]/40 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Delete clinic"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {deleteTarget && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#1a2a38]">Delete clinic?</h3>
                    <p className="text-sm text-[#6b7a8d] mt-1">
                      This will permanently delete <span className="font-semibold text-[#1a2a38]">{deleteTarget.name}</span>, all their tasks, documents, and login credentials. This cannot be undone.
                    </p>
                    {deleteTarget.username && (
                      <p className="text-xs text-[#6b7a8d] mt-2 font-mono bg-gray-50 rounded px-2 py-1 inline-block">
                        Portal account <span className="font-semibold">@{deleteTarget.username}</span> will be wiped
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteTarget(null)}
                    disabled={deleting}
                    className="flex-1 border border-[#dde4ed] text-[#6b7a8d] px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={deleteClinic}
                    disabled={deleting}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {deleting ? 'Deleting...' : 'Delete Clinic'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
