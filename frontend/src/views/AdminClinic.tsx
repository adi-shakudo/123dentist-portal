import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, LogOut, Trash2, Sparkles, X } from 'lucide-react'
import TaskRow from '../components/TaskRow'
import ProgressBar from '../components/ProgressBar'

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

export default function AdminClinic({ user }: Props) {
  const { clinicId } = useParams<{ clinicId: string }>()
  const nav = useNavigate()
  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadTaskId, setUploadTaskId] = useState('')
  const [showUpload, setShowUpload] = useState(false)
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

  if (!clinic) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => nav('/')} className="text-gray-400 hover:text-gray-600 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="text-xl">🦷</span>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{clinic.name}</h1>
              <p className="text-xs text-gray-500">{clinic.email_contact}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              <Upload className="w-4 h-4" /> Upload File
            </button>
            <a href="/auth/logout" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
              <LogOut className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload Document</h3>
              <button onClick={() => setShowUpload(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Attribute to Task <span className="text-gray-400 font-normal">(optional)</span></label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={uploadTaskId} onChange={e => setUploadTaskId(e.target.value)}>
                  <option value="">— General / No specific task —</option>
                  {tasks.filter(t => !t.is_tbd).map(t => (
                    <option key={t.task_id} value={t.task_id}>{t.ref_id} — {t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">File</label>
                <input ref={fileRef} type="file" className="hidden"
                  onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0])} />
                <button onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg py-8 text-center text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50">
                  {uploading ? 'Uploading...' : 'Click to select file'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Progress */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Overall Progress</h2>
          <ProgressBar pct={progress} complete={complete.length} total={active.length} />
        </div>

        {/* Task sections */}
        {grouped.map(({ exhibit, tasks: sectionTasks }) => (
          <section key={exhibit}>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-base font-semibold text-gray-800">{exhibit}</h2>
              <span className="text-xs text-gray-400">
                {sectionTasks.filter(t => t.enabled && t.status === 'Complete').length} / {sectionTasks.filter(t => t.enabled && !t.is_tbd).length} complete
              </span>
            </div>
            <div className="space-y-2">
              {sectionTasks.map(t => (
                <TaskRow key={t.clinic_task_id} task={t} isAdmin clinicId={clinicId}
                  onStatusChange={updateStatus} onToggle={toggleTask} />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  )
}
