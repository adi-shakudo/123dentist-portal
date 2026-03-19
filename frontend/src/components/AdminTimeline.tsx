import { useState } from 'react'
import { CheckCircle2, Clock, AlertCircle, Mail } from 'lucide-react'
import StatusBadge from './StatusBadge'
import EmailNotifyModal from './EmailNotifyModal'

interface Task {
  clinic_task_id: string
  task_id: string
  ref_id: string
  name: string
  phase: number
  exhibit: string
  priority: string
  is_tbd: boolean
  enabled: boolean
  status: string
  what_to_provide?: string
  how_to_prepare?: string
  data_room_path?: string
  due_week?: string
  files: { id: string; filename: string; uploaded_at: string }[]
}

interface Props {
  tasks: Task[]
  clinicId: string
  clinicName: string
  clinicEmail: string
  onStatusChange: (clinicTaskId: string, status: string) => void
}

const WEEK_ORDER: Record<string, number> = {
  'Day 1': 0, 'Week 1': 1, 'Week 2': 2, 'Week 3': 3,
  'Monthly until closing': 4, '3 weeks before closing': 5,
  '2 weeks before closing': 6, 'Closing date': 7, 'On or shortly after closing': 8,
}

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

const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 }
const PRIORITY_COLORS: Record<string, string> = {
  High: 'text-red-600 bg-red-50 border-red-200',
  Medium: 'text-amber-600 bg-amber-50 border-amber-200',
  Low: 'text-gray-500 bg-gray-50 border-gray-200',
}
const STATUSES = ['Not Started', 'Submitted', 'Sent Back for Revision', 'Complete']
const PORTAL_URL = 'https://123dentist-portal-public.dev.hyperplane.dev'

export default function AdminTimeline({ tasks, clinicId, clinicName, clinicEmail, onStatusChange }: Props) {
  const [notifyTask, setNotifyTask] = useState<Task | null>(null)

  const enabledTasks = tasks.filter(t => t.enabled && !t.is_tbd && t.due_week)

  const calendarWeeks = (() => {
    const byWeek: Record<string, Task[]> = {}
    enabledTasks.forEach(t => {
      const w = t.due_week!
      if (!byWeek[w]) byWeek[w] = []
      byWeek[w].push(t)
    })
    return Object.entries(byWeek)
      .sort(([a], [b]) => (WEEK_ORDER[a] ?? 99) - (WEEK_ORDER[b] ?? 99))
      .map(([week, wTasks]) => ({
        week,
        tasks: [...wTasks].sort((a, b) =>
          (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2) ||
          a.name.localeCompare(b.name)
        ),
      }))
  })()

  if (calendarWeeks.length === 0) {
    return (
      <div className="text-center py-16 text-[#6b7a8d]">
        <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>No tasks with due dates found.</p>
      </div>
    )
  }

  return (
    <>
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
                  <div className={`w-3.5 h-3.5 rounded-full border-2 z-10 flex items-center justify-center ${
                    allDone ? 'bg-emerald-500 border-emerald-500'
                    : hasRevision ? 'bg-amber-400 border-amber-400'
                    : 'bg-white border-[#1e3a4f]'
                  }`}>
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
                        <div key={t.clinic_task_id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-gray-50/50 transition-colors group">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border shrink-0 mt-0.5 ${PRIORITY_COLORS[t.priority] || PRIORITY_COLORS.Low}`}>
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
                              <p className="text-[11px] text-[#2e8fb5] mt-1">
                                📎 {t.files.length} document{t.files.length !== 1 ? 's' : ''} uploaded
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => setNotifyTask(t)}
                              className="p-1.5 rounded-lg text-[#6b7a8d]/50 hover:text-[#2e8fb5] hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100"
                              title="Send email notification"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                            <select
                              className="text-xs border border-[#dde4ed] rounded-lg px-2 py-1.5 text-[#1a2a38] bg-white focus:outline-none focus:ring-1 focus:ring-[#2e8fb5]"
                              value={t.status}
                              onChange={e => onStatusChange(t.clinic_task_id, e.target.value)}
                            >
                              {STATUSES.map(s => <option key={s}>{s}</option>)}
                            </select>
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

      {notifyTask && (
        <EmailNotifyModal
          task={notifyTask}
          clinicId={clinicId}
          clinicName={clinicName}
          clinicEmail={clinicEmail}
          portalUrl={PORTAL_URL}
          onClose={() => setNotifyTask(null)}
        />
      )}
    </>
  )
}
