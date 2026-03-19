import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, LogOut, X, Building2, FolderOpen, ChevronRight, Eye, ListTodo, Info, FolderOpen as FolderIcon } from 'lucide-react'
import TaskRow from '../components/TaskRow'
import ProgressBar from '../components/ProgressBar'
import ClinicInfoEditor from '../components/ClinicInfoEditor'
import DocumentStore from '../components/DocumentStore'

interface Task {
  clinic_task_id: string; task_id: string; ref_id: string; name: string
  phase: number; exhibit: string; priority: string; is_tbd: boolean
  enabled: boolean; status: string; what_to_provide?: string; how_to_prepare?: string
  data_room_path?: string; due_week?: string; raw_instructions?: string
  files: { id: string; filename: string; uploaded_at: string }[]
}

interface Clinic { id: string; name: string; email_contact: string }
interface Props { user: { name: string; email: string } }

const EXHIBIT_ORDER = ['Financial Due Diligence', 'Legal Due Diligence', 'Lease', 'Closing Day', 'Onboarding & Integration']
type AdminTab = 'tasks' | 'documents' | 'info'

export default function AdminClinic({ user }: Props) {
  const { clinicId } = useParams<{ clinicId: string }>()
  const nav = useNavigate()
  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadTaskId, setUploadTaskId] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [activeTab, setActiveTab] = useState<AdminTab>('tasks')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = () => {
    fetch(`/api/admin/clinics/${clinicId}`).then(r => r.json()).then(setClinic)
    fetch(`/api/admin/clinics/${clinicId}/tasks`).then(r => r.json()).then(setTasks)
  }
  useEffect(load, [clinicId])

  const active = tasks.filter(t => t.enabled && !t.is_tbd)
  const complete = active.filter(t => t.status === 'Complete')
  const progress = active.length ? Math.round(complete.length / active.length * 100) : 0

  const updateStatus = async (ctId: string, status: string) => {
    await fetch(`/api/admin/clinics/${clinicId}/tasks/${ctId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setTasks(ts => ts.map(t => t.clinic_task_id === ctId ? { ...t, status } : t))
  }

  const toggleTask = async (ctId: string, enabled: boolean) => {
    await fetch(`/api/admin/clinics/${clinicId}/tasks/${ctId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
    setTasks(ts => ts.map(t => t.clinic_task_id === ctId ? { ...t, enabled } : t))
  }

  const uploadFile = async (file: File) => {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    if (uploadTaskId) fd.append('task_id', uploadTaskId)
    const r = await fetch(`/api/admin/clinics/${clinicId}/files`, { method: 'POST', body: fd })
    if (r.ok) { load(); setShowUpload(false); setUploadTaskId('') }
    setUploading(false)
  }

  const grouped = EXHIBIT_ORDER.reduce((acc, ex) => {
    const exTasks = tasks.filter(t => t.exhibit === ex)
    if (exTasks.length) acc.push({ exhibit: ex, tasks: exTasks })
    return acc
  }, [] as { exhibit: string; tasks: Task[] }[])

  if (!clinic) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-[#1e3a4f] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
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
            <button
              onClick={() => nav('/')}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white transition-colors w-full text-left"
            >
              <Building2 className="h-4 w-4 shrink-0" />
              Clinics
            </button>

            <div className="rounded-lg bg-white/10">
              <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium bg-[#284d65] text-white">
                <FolderOpen className="h-4 w-4 shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block truncate">{clinic.name}</span>
                  <span className="block text-[10px] font-normal text-white/60 truncate">
                    {clinic.email_contact}
                  </span>
                </span>
                <ChevronRight className="h-3 w-3 shrink-0 text-white/50" />
              </div>
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

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-[#dde4ed] bg-white px-8 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => nav('/')} className="text-[#6b7a8d] hover:text-[#1a2a38] transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-[#1a2a38]">{clinic.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#6b7a8d]">{user.name || user.email}</span>
            <button onClick={() => nav(`/portal/${clinicId}`)}
              className="flex items-center gap-2 border border-[#dde4ed] text-[#1a2a38] bg-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              <Eye className="w-4 h-4" /> View Clinic Portal
            </button>
            <button onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 bg-[#1e3a4f] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#284d65] transition-colors">
              <Upload className="w-4 h-4" /> Upload File
            </button>
          </div>
        </header>

        {showUpload && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#1a2a38]">Upload Document</h3>
                <button onClick={() => setShowUpload(false)} className="text-[#6b7a8d] hover:text-[#1a2a38]">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-[#6b7a8d] uppercase tracking-wide block mb-1.5">
                    Attribute to Task <span className="text-[#6b7a8d]/60 font-normal normal-case">(optional)</span>
                  </label>
                  <select className="w-full border border-[#dde4ed] rounded-lg px-3 py-2 text-sm text-[#1a2a38] focus:outline-none focus:ring-2 focus:ring-[#2e8fb5]"
                    value={uploadTaskId} onChange={e => setUploadTaskId(e.target.value)}>
                    <option value="">— General / No specific task —</option>
                    {tasks.filter(t => !t.is_tbd).map(t => (
                      <option key={t.task_id} value={t.task_id}>{t.ref_id} — {t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b7a8d] uppercase tracking-wide block mb-1.5">File</label>
                  <input ref={fileRef} type="file" className="hidden"
                    onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0])} />
                  <button onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="w-full border-2 border-dashed border-[#dde4ed] rounded-xl py-8 text-center text-sm text-[#6b7a8d] hover:border-[#2e8fb5] hover:text-[#2e8fb5] transition-colors disabled:opacity-50">
                    {uploading ? 'Uploading...' : 'Click to select file'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white border-b border-[#dde4ed] px-8 shrink-0">
          <div className="flex">
            {([['tasks', 'Tasks', ListTodo], ['documents', 'Documents', FolderOpen], ['info', 'Clinic Info', Info]] as [AdminTab, string, any][]).map(([id, label, Icon]) => (
              <button key={id} onClick={() => setActiveTab(id)} className={'flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ' + (activeTab === id ? 'border-[#1e3a4f] text-[#1e3a4f]' : 'border-transparent text-[#6b7a8d] hover:text-[#1a2a38]')}>
                <Icon className="w-4 h-4" />{label}
              </button>
            ))}
          </div>
        </div>

        <main className="flex-1 overflow-y-auto px-8 py-6">
          {activeTab === 'tasks' && (
            <div className="space-y-8">
              <div className="bg-white border border-[#dde4ed] rounded-xl p-6">
                <h2 className="text-xs font-medium text-[#6b7a8d] uppercase tracking-wide mb-4">Overall Progress</h2>
                <ProgressBar pct={progress} complete={complete.length} total={active.length} />
              </div>
              {grouped.map(({ exhibit, tasks: sectionTasks }) => {
                const sectionComplete = sectionTasks.filter(t => t.enabled && t.status === 'Complete').length
                const sectionActive = sectionTasks.filter(t => t.enabled && !t.is_tbd).length
                return (
                  <section key={exhibit}>
                    <div className="flex items-center gap-3 mb-3">
                      <h2 className="text-lg font-semibold text-[#1a2a38]">{exhibit}</h2>
                      <span className="text-xs font-medium text-[#6b7a8d] bg-gray-100 px-2.5 py-0.5 rounded-full">
                        {sectionComplete} / {sectionActive} complete
                      </span>
                    </div>
                    <div className="space-y-2">
                      {sectionTasks.map(t => (
                        <TaskRow key={t.clinic_task_id} task={t} isAdmin clinicId={clinicId}
                          onStatusChange={updateStatus} onToggle={toggleTask} />
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          )}
          {activeTab === 'documents' && clinicId && (
            <DocumentStore clinicId={clinicId} isAdmin onDelete={() => {}} />
          )}
          {activeTab === 'info' && clinicId && (
            <ClinicInfoEditor clinicId={clinicId} />
          )}
        </main>
      </div>
    </div>
  )
}
