import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { LogOut, LayoutDashboard, ArrowLeft, ListTodo, CalendarDays, CheckCircle2, Clock, AlertCircle, Info } from 'lucide-react'
import TaskRow from '../components/TaskRow'
import ProgressBar from '../components/ProgressBar'
import StatusBadge from '../components/StatusBadge'
import ClinicInfoEditor from '../components/ClinicInfoEditor'
import ClinicInfoEditor from '../components/ClinicInfoEditor'

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
interface Props { user: { name: string; email: string }; adminPreview?: boolean }

const EXHIBIT_ORDER = ['Financial Due Diligence', 'Legal Due Diligence', 'Lease', 'Closing Day', 'Onboarding & Integration']
const PHASE_LABEL: Record<number, string> = { 1: 'Phase 1 — Pre-Partner Date', 2: 'Phase 2 — Partner Date (Closing Day)', 3: 'Phase 3 — Post-Partner Date' }

const WEEK_ORDER: Record<string, number> = {
  'Day 1': 0,
  'Week 1': 1,
  'Week 2': 2,
  'Week 3': 3,
  'Monthly until closing': 4,
  '3 weeks before closing': 5,
  '2 weeks before closing': 6,
  'Closing date': 7,
  'On or shortly after closing': 8,
}

const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 }

const WEEK_DESCRIPTIONS: Record<string, string> = {
  'Day 1': 'Items needed on your first day of engagement',
  'Week 1': 'Foundation documents — start gathering immediately',
  'Week 2': 'Secondary documents and additional detail',
  'Week 3': 'Supporting materials and legal / compliance items',
  'Monthly until closing': 'Ongoing — submit each month until closing',
  '3 weeks before closing': 'Required before closing preparations begin',
  '2 weeks before closing': 'Final document submissions before closing',
  'Closing date': 'Required on the day of closing',
  'On or shortly after closing': 'Post-close administrative items',
}

const PRIORITY_COLORS: Record<string, string> = {
  High: 'text-red-600 bg-red-50 border-red-200',
  Medium: 'text-amber-600 bg-amber-50 border-amber-200',
  Low: 'text-gray-500 bg-gray-50 border-gray-200',
}

type TabId = 'tasks' | 'calendar' | 'info'

export default function ClinicPortal({ user, adminPreview }: Props) {
  const { clinicId: routeClinicId } = useParams<{ clinicId: string }>()
  const nav = useNavigate()
  const [me, setMe] = useState<Me | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [progress, setProgress] = useState<Progress | null>(null)
  const [clinicId, setClinicId] = useState<string>(routeClinicId || '')
  const [activeTab, setActiveTab] = useState<TabId>('tasks')

  const qs = routeClinicId ? '?clinic_id=' + routeClinicId : ''

  const load = () => {
    fetch('/api/portal/me' + qs).then(r => r.ok ? r.json() : null).then(d => {
      if (d) { setMe(d); setClinicId(d.clinic_id) }
    })
    fetch('/api/portal/tasks' + qs).then(r => r.json()).then(setTasks)
    fetch('/api/portal/progress' + qs).then(r => r.json()).then(setProgress)
  }

  useEffect(load, [routeClinicId])

  useEffect(() => {
    const es = new EventSource('/api/portal/events')
    es.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data)
        if (evt.type === 'file_uploaded' || evt.type === 'status_changed') load()
      } catch {}
    }
    es.onerror = () => {}
    return () => es.close()
  }, [])

  const grouped = EXHIBIT_ORDER.reduce((acc, ex) => {
    const exTasks = tasks.filter(t => t.exhibit === ex)
    if (exTasks.length) acc.push({ exhibit: ex, phase: exTasks[0].phase, tasks: exTasks })
    return acc
  }, [] as { exhibit: string; phase: number; tasks: Task[] }[])

  const calendarWeeks = (() => {
    const byWeek: Record<string, Task[]> = {}
    tasks.filter(t => !t.is_tbd && t.due_week).forEach(t => {
      const w = t.due_week!
      if (!byWeek[w]) byWeek[w] = []
      byWeek[w].push(t)
    })
    return Object.entries(byWeek)
      .sort(([a], [b]) => (WEEK_ORDER[a] ?? 99) - (WEEK_ORDER[b] ?? 99))
      .map(([week, wTasks]) => ({
        week,
        tasks: [...wTasks].sort((a, b) => {
          const pd = (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2)
          return pd !== 0 ? pd : a.name.localeCompare(b.name)
        }),
      }))
  })()

  const phases = [1, 2, 3]

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <aside className="flex h-screen w-64 flex-col bg-[#1e3a4f] text-white shrink-0">
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
            <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTyAGrj-_mCPA_rC69bx9PkCJ4hD-gPcuNI0Q&s" alt="123Dentist" className="h-full w-full object-contain p-0.5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold leading-tight tracking-tight text-white">123Dentist Onboarding</span>
            <span className="text-[10px] text-white/50">Partner Portal</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4">
          <div className="space-y-1">
            <button onClick={() => setActiveTab('tasks')} className={'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium w-full text-left transition-colors ' + (activeTab === 'tasks' ? 'bg-[#284d65] text-white' : 'text-white/70 hover:bg-white/5 hover:text-white')}>
              <ListTodo className="h-4 w-4 shrink-0" />
              Task List
            </button>
            <button onClick={() => setActiveTab('calendar')} className={'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium w-full text-left transition-colors ' + (activeTab === 'calendar' ? 'bg-[#284d65] text-white' : 'text-white/70 hover:bg-white/5 hover:text-white')}>
              <CalendarDays className="h-4 w-4 shrink-0" />
              Timeline
            </button>
            <button onClick={() => setActiveTab('info')} className={'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium w-full text-left transition-colors ' + (activeTab === 'info' ? 'bg-[#284d65] text-white' : 'text-white/70 hover:bg-white/5 hover:text-white')}>
              <Info className="h-4 w-4 shrink-0" />
              Clinic Info
            </button>
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
                  <div className="bg-emerald-400 h-2 rounded-full transition-all duration-500" style={{ width: progress.overall_pct + '%' }} />
                </div>
                <p className="text-[10px] text-white/40 mt-1">{progress.tasks_complete} of {progress.tasks_total} tasks</p>
              </div>
              {progress.sections.filter(s => s.exhibit !== 'Closing Day').map(s => (
                <div key={s.exhibit}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-white/60 truncate pr-2">{s.exhibit}</span>
                    <span className="text-[10px] font-semibold text-white/80 shrink-0">{s.pct}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1">
                    <div className="bg-white/40 h-1 rounded-full transition-all duration-500" style={{ width: s.pct + '%' }} />
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
            <a onClick={() => fetch("/api/auth/logout", {method:"POST"}).then(() => window.location.href="/")} href="#" className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70 transition-colors">
              <LogOut className="w-3 h-3" />
              Sign out
            </a>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        {adminPreview && (
          <div className="bg-amber-50 border-b border-amber-200 px-8 py-2 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Admin Preview</span>
              <span className="text-xs text-amber-600">— viewing as clinic partner</span>
            </div>
            <button onClick={() => nav('/admin/clinics/' + routeClinicId)} className="flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-900 font-medium transition-colors">
              <ArrowLeft className="w-3 h-3" />
              Back to Admin View
            </button>
          </div>
        )}

        <header className="flex h-16 items-center justify-between border-b border-[#dde4ed] bg-white px-8 shrink-0">
          <h1 className="text-2xl font-bold tracking-tight text-[#1a2a38]">{me?.clinic_name || 'Your Onboarding'}</h1>
          <span className="text-sm text-[#6b7a8d]">{user.name || user.email}</span>
        </header>

        <div className="bg-white border-b border-[#dde4ed] px-8 shrink-0">
          <div className="flex">
            {([['tasks', 'Task List', ListTodo], ['calendar', 'Timeline', CalendarDays], ['info', 'Clinic Info', Info]] as [TabId, string, any][]).map(([id, label, Icon]) => (
              <button key={id} onClick={() => setActiveTab(id)} className={'flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ' + (activeTab === id ? 'border-[#1e3a4f] text-[#1e3a4f]' : 'border-transparent text-[#6b7a8d] hover:text-[#1a2a38]')}>
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <main className="flex-1 overflow-y-auto px-8 py-6">

          {activeTab === 'tasks' && (
            <div className="space-y-8">
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
                            <div className="h-1.5 rounded-full transition-all" style={{ width: s.pct + '%', backgroundColor: '#1e3a4f' }} />
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
                      <span className="text-xs font-bold text-white bg-[#1e3a4f] px-3 py-1.5 rounded-full uppercase tracking-wide">{PHASE_LABEL[phase]}</span>
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
                            {sectionTasks.map(t => <TaskRow key={t.task_id} task={t} clinicId={clinicId} />)}
                          </div>
                        </section>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {activeTab === 'calendar' && (
            <div>
              {calendarWeeks.length === 0 ? (
                <div className="text-center py-20 text-[#6b7a8d]">
                  <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No tasks with due dates found.</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-[143px] top-6 bottom-6 w-px bg-[#dde4ed]" />
                  <div className="space-y-6">
                    {calendarWeeks.map(({ week, tasks: wTasks }) => {
                      const complete = wTasks.filter(t => t.status === 'Complete').length
                      const total = wTasks.length
                      const allDone = complete === total
                      const hasRevision = wTasks.some(t => t.status === 'Sent Back for Revision')
                      return (
                        <div key={week} className="flex gap-0">
                          <div className="w-36 shrink-0 text-right pr-5 pt-4">
                            <p className="text-sm font-semibold text-[#1a2a38] leading-tight">{week}</p>
                            <p className="text-xs text-[#6b7a8d] mt-0.5">{complete}/{total} done</p>
                          </div>
                          <div className="flex flex-col items-center pt-5 shrink-0 w-7">
                            <div className={'w-3.5 h-3.5 rounded-full border-2 z-10 flex items-center justify-center ' + (allDone ? 'bg-emerald-500 border-emerald-500' : hasRevision ? 'bg-amber-400 border-amber-400' : 'bg-white border-[#1e3a4f]')}>
                              {allDone && <CheckCircle2 className="w-2 h-2 text-white" />}
                              {hasRevision && !allDone && <AlertCircle className="w-2 h-2 text-white" />}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="bg-white border border-[#dde4ed] rounded-xl overflow-hidden">
                              <div className="px-5 py-3 border-b border-[#dde4ed]/60 bg-gray-50/60 flex items-center justify-between">
                                <div>
                                  <p className="text-xs font-semibold text-[#1a2a38]">{week}</p>
                                  <p className="text-[11px] text-[#6b7a8d] mt-0.5">{WEEK_DESCRIPTIONS[week] || ''}</p>
                                </div>
                                {allDone ? (
                                  <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-emerald-100">
                                    <CheckCircle2 className="w-3 h-3" /> All complete
                                  </span>
                                ) : (
                                  <span className="text-xs font-medium text-[#6b7a8d] bg-gray-100 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                                    <Clock className="w-3 h-3" /> {total - complete} remaining
                                  </span>
                                )}
                              </div>
                              <div className="divide-y divide-[#dde4ed]/50">
                                {wTasks.map(t => (
                                  <div key={t.task_id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                                    <span className={'text-[10px] font-semibold px-2 py-0.5 rounded border shrink-0 mt-0.5 ' + (PRIORITY_COLORS[t.priority] || PRIORITY_COLORS.Low)}>
                                      {t.priority}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-baseline gap-2 flex-wrap">
                                        <span className="text-[11px] font-mono text-[#6b7a8d] shrink-0">{t.ref_id}</span>
                                        <span className="text-sm font-medium text-[#1a2a38]">{t.name}</span>
                                      </div>
                                      <p className="text-[11px] text-[#6b7a8d] mt-0.5">{t.exhibit}</p>
                                      {t.what_to_provide && (
                                        <p className="text-xs text-[#6b7a8d]/80 mt-1 line-clamp-2">{t.what_to_provide}</p>
                                      )}
                                      {t.files.length > 0 && (
                                        <p className="text-[11px] text-[#2e8fb5] mt-1">📎 {t.files.length} document{t.files.length !== 1 ? 's' : ''} attached</p>
                                      )}
                                    </div>
                                    <div className="shrink-0 pt-0.5">
                                      <StatusBadge status={t.status} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          {activeTab === 'info' && clinicId && (
            <ClinicInfoEditor clinicId={clinicId} readOnly />
          )}
        </main>
      </div>
    </div>
  )
}
