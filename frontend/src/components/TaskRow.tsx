import { useState } from 'react'
import { ChevronDown, ChevronRight, FileText, Download, FolderOpen, Calendar, AlertCircle } from 'lucide-react'
import StatusBadge from './StatusBadge'

interface FileItem { id: string; filename: string; uploaded_at: string }

interface Task {
  task_id: string
  ref_id: string
  name: string
  phase: number
  exhibit: string
  priority: string
  is_tbd: boolean
  status: string
  what_to_provide?: string
  how_to_prepare?: string
  data_room_path?: string
  due_week?: string
  files: FileItem[]
  // admin-only
  clinic_task_id?: string
  enabled?: boolean
  raw_instructions?: string
}

interface TaskRowProps {
  task: Task
  isAdmin?: boolean
  clinicId?: string
  onStatusChange?: (clinicTaskId: string, status: string) => void
  onToggle?: (clinicTaskId: string, enabled: boolean) => void
}

const STATUSES = ['Not Started', 'Submitted', 'Sent Back for Revision', 'Complete']
const PRIORITY_COLOR: Record<string, string> = {
  High: 'text-red-600',
  Medium: 'text-amber-600',
  Low: 'text-[#6b7a8d]',
}

export default function TaskRow({ task, isAdmin, clinicId, onStatusChange, onToggle }: TaskRowProps) {
  const [open, setOpen] = useState(false)

  if (task.is_tbd) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-white border border-dashed border-[#dde4ed] rounded-xl opacity-60">
        <AlertCircle className="w-4 h-4 text-[#6b7a8d] shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm text-[#6b7a8d] font-medium">{task.ref_id} — {task.name}</span>
        </div>
        <span className="text-xs bg-orange-100 text-orange-600 px-2.5 py-0.5 rounded-full font-medium shrink-0">🚧 TBD</span>
      </div>
    )
  }

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${open ? 'border-[#2e8fb5]/30 shadow-sm' : 'border-[#dde4ed] hover:border-[#dde4ed]/80 hover:shadow-sm'}`}>
      {/* Row header */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left bg-white hover:bg-gray-50/50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-[#6b7a8d] shrink-0">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>

        <span className="text-xs font-mono text-[#6b7a8d] w-12 shrink-0">{task.ref_id}</span>

        <span className="flex-1 text-sm font-medium text-[#1a2a38] truncate">{task.name}</span>

        {task.files.length > 0 && (
          <span className="text-xs text-[#2e8fb5] flex items-center gap-1 shrink-0">
            <FileText className="w-3 h-3" />
            {task.files.length}
          </span>
        )}

        <span className={`text-xs font-medium shrink-0 ${PRIORITY_COLOR[task.priority] ?? 'text-[#6b7a8d]'}`}>
          {task.priority}
        </span>

        {isAdmin ? (
          <select
            className="text-xs border border-[#dde4ed] rounded-lg px-2 py-1 shrink-0 bg-white text-[#1a2a38] focus:outline-none focus:ring-1 focus:ring-[#2e8fb5]"
            value={task.status}
            onClick={e => e.stopPropagation()}
            onChange={e => onStatusChange?.(task.clinic_task_id!, e.target.value)}
          >
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        ) : (
          <div className="shrink-0" onClick={e => e.stopPropagation()}>
            <StatusBadge status={task.status} />
          </div>
        )}

        {isAdmin && (
          <label className="flex items-center gap-1.5 text-xs text-[#6b7a8d] shrink-0 cursor-pointer" onClick={e => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={task.enabled ?? true}
              onChange={e => onToggle?.(task.clinic_task_id!, e.target.checked)}
              className="rounded border-[#dde4ed] text-[#1e3a4f] focus:ring-[#2e8fb5]"
            />
            Active
          </label>
        )}
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="px-4 pb-4 pt-2 bg-white border-t border-[#dde4ed]/60 space-y-4">
          {task.what_to_provide && (
            <div>
              <p className="text-xs font-medium text-[#6b7a8d] uppercase tracking-wide mb-1">What to provide</p>
              <p className="text-sm text-gray-700">{task.what_to_provide}</p>
            </div>
          )}

          {task.how_to_prepare && (
            <div>
              <p className="text-xs font-medium text-[#6b7a8d] uppercase tracking-wide mb-1">How to prepare</p>
              <p className="text-sm text-gray-700">{task.how_to_prepare}</p>
            </div>
          )}

          <div className="flex gap-4 flex-wrap">
            {task.data_room_path && (
              <div className="flex items-center gap-1.5 text-xs text-[#6b7a8d]">
                <FolderOpen className="w-3.5 h-3.5" />
                <span className="font-mono">{task.data_room_path}</span>
              </div>
            )}
            {task.due_week && (
              <div className="flex items-center gap-1.5 text-xs text-[#6b7a8d]">
                <Calendar className="w-3.5 h-3.5" />
                <span>Due: {task.due_week}</span>
              </div>
            )}
          </div>

          {task.files.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[#6b7a8d] uppercase tracking-wide mb-2">Documents</p>
              <div className="space-y-1.5">
                {task.files.map(f => (
                  <a
                    key={f.id}
                    href={`/api/admin/clinics/${clinicId}/files/${f.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-[#2e8fb5] hover:text-[#1e3a4f] hover:underline"
                  >
                    <Download className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{f.filename}</span>
                    <span className="text-xs text-[#6b7a8d] shrink-0">{new Date(f.uploaded_at).toLocaleDateString()}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
