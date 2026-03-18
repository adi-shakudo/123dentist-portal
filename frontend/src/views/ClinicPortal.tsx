import { useEffect, useState } from 'react'
import { LogOut } from 'lucide-react'
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

  // SSE — real-time updates
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
    es.onerror = () => { /* auto-reconnects */ }
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

  // Group by phase for phase headers
  const phases = [1, 2, 3]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🦷</span>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">123Dentist Partner Onboarding</h1>
              <p className="text-xs text-gray-500">{me?.clinic_name || 'Loading...'}</p>
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

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Progress summary */}
        {progress && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Your Progress</h2>
            <ProgressBar pct={progress.overall_pct} complete={progress.tasks_complete} total={progress.tasks_total} />
            {progress.sections.length > 1 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                {progress.sections.filter(s => s.exhibit !== 'Closing Day').map(s => (
                  <div key={s.exhibit} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 truncate mb-1.5">{s.exhibit}</p>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">{s.complete}/{s.total}</span>
                      <span className="text-xs font-semibold text-blue-700">{s.pct}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${s.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Task list by phase */}
        {phases.map(phase => {
          const phaseGroups = grouped.filter(g => g.phase === phase)
          if (!phaseGroups.length) return null
          return (
            <div key={phase}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wide">
                  {PHASE_LABEL[phase]}
                </span>
              </div>
              <div className="space-y-6">
                {phaseGroups.map(({ exhibit, tasks: sectionTasks }) => (
                  <section key={exhibit}>
                    <div className="flex items-center gap-3 mb-3">
                      <h2 className="text-base font-semibold text-gray-800">{exhibit}</h2>
                      <span className="text-xs text-gray-400">
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
  )
}
