import { useEffect, useState } from 'react'
import { LogOut, LayoutDashboard } from 'lucide-react'
import TaskRow from '../components/TaskRow'
import ProgressBar from '../components/ProgressBar'

interface Task {
  task_id: string; ref_id: string; name: string; phase: number; exhibit: string
  priority: string; is_tbd: boolean; status: string; what_to_provide?: string
  how_to_prepare?: string; data_room_path?: string; due_week?: string
  files: { id: string; filename: string; uploaded_at: string }[]
}

interface Progress {
  overall_pct: number; tasks_complete: number; tasks_total: number
  sections: { exhibit: string; total: number; complete: number; pct: number }[]
}

interface Me { clinic_id: string; clinic_name: string }
interface Props { user: { name: string; email: string } }

const EXHIBIT_ORDER = ['Financial Due Diligence', 'Legal Due Diligence', 'Lease', 'Closing Day', 'Onboarding & Integration']
const PHASE_LABEL: Record<number, string> = { 1: 'Phase 1 — Pre-Partner Date', 2: 'Phase 2 — Partner Date (Closing Day)', 3: 'Phase 3 — Post-Partner Date' }

export default function ClinicPortal({ user }: Props) {
  const [me, setMe] = useState<Me | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [progress, setProgress] = useState<Progress | null>(null)
  const [clinicId, setClinicId] = useState<string>('')

  const load = () => {
    fetch('/api/portal/me').then(r => r.ok ? r.json() : null).then(d => {
      if (d) { setMe(d); setClinicId(d.clinic_id) }
    })
    fetch('/api/portal/tasks').then(r => r.json()).then(setTasks)
    fetch('/api/portal/progress').then(r => r.json()).then(setProgress)
  }

  useEffect(load, [])

  useEffect(() => {
    const es = new EventSource('/api/portal/events')
    es.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data)
        if (evt.type === 'file_uploaded' || evt.type === 'status_changed') {
          load()
        }
      } catch {}
    }
    es.onerror = () => {}
    return () => es.close()
  }, [])

  const grouped = EXHIBIT_ORDER.reduce((acc, ex) => {
    const exTasks = tasks.filter(t => t.exhibit === ex)
    if (exTasks.length) {
      const phase = exTasks[0].phase
      acc.push({ exhibit: ex, phase, tasks: exTasks })
    }
    return acc
  }, [] as { exhibit: string; phase: number; tasks: Task[] }[])

  const phases = [1, 2, 3]

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
            <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium bg-[#284d65] text-white">
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              Overview
            </div>
          </div>

          {progress && (
            <div className="mt-6 px-3 space-y-3">
              <p className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Progress</p>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-white/70">Overall</span>
                  <span className="text-xs font-semibold text-white">{progress.overall_pct}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-emerald-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progress.overall_pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-white/40 mt-1">
                  {progress.tasks_complete} of {progress.tasks_total} tasks
                </p>
              </div>

              {progress.sections.filter(s => s.exhibit !== 'Closing Day').map(s => (
                <div key={s.exhibit}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-white/60 truncate pr-2">{s.exhibit}</span>
                    <span className="text-[10px] font-semibold text-white/80 shrink-0">{s.pct}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1">
                    <div
                      className="bg-white/40 h-1 rounded-full transition-all duration-500"
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </nav>

        <div className="border-t border-white/10 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] text-white/40">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              System Online
            </div>
            <a href="/auth/logout" className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70 transition-colors">
              <LogOut className="w-3 h-3" />
              Sign out
            </a>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-[#dde4ed] bg-white px-8 shrink-0">
          <h1 className="text-2xl font-bold tracking-tight text-[#1a2a38]">
            {me?.clinic_name || 'Your Onboarding'}
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#6b7a8d]">{user.name || user.email}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
          {progress && (
            <div className="bg-white border border-[#dde4ed] rounded-xl p-6">
              <h2 className="text-xs font-medium text-[#6b7a8d] uppercase tracking-wide mb-4">Your Progress</h2>
              <ProgressBar pct={progress.overall_pct} complete={progress.tasks_complete} total={progress.tasks_total} />
              {progress.sections.length > 1 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                  {progress.sections.filter(s => s.exhibit !== 'Closing Day').map(s => (
                    <div key={s.exhibit} className="bg-gray-50 rounded-xl p-3 border border-[#dde4ed]/50">
                      <p className="text-xs text-[#6b7a8d] truncate mb-1.5">{s.exhibit}</p>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[#6b7a8d]">{s.complete}/{s.total}</span>
                        <span className="text-xs font-semibold text-[#1e3a4f]">{s.pct}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${s.pct}%`, backgroundColor: '#1e3a4f' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {phases.map(phase => {
            const phaseGroups = grouped.filter(g => g.phase === phase)
            if (!phaseGroups.length) return null
            return (
              <div key={phase}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-bold text-white bg-[#1e3a4f] px-3 py-1.5 rounded-full uppercase tracking-wide">
                    {PHASE_LABEL[phase]}
                  </span>
                </div>
                <div className="space-y-6">
                  {phaseGroups.map(({ exhibit, tasks: sectionTasks }) => (
                    <section key={exhibit}>
                      <div className="flex items-center gap-3 mb-3">
                        <h2 className="text-lg font-semibold text-[#1a2a38]">{exhibit}</h2>
                        <span className="text-xs font-medium text-[#6b7a8d] bg-gray-100 px-2.5 py-0.5 rounded-full">
                          {sectionTasks.filter(t => t.status === 'Complete').length} / {sectionTasks.filter(t => !t.is_tbd).length} complete
                        </span>
                      </div>
                      <div className="space-y-2">
                        {sectionTasks.map(t => (
                          <TaskRow key={t.task_id} task={t} clinicId={clinicId} />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            )
          })}
        </main>
      </div>
    </div>
  )
}
