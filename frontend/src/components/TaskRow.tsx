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
  High: 'text-red-500',
  Medium: 'text-amber-500',
  Low: 'text-gray-400',
}

export default function TaskRow({ task, isAdmin, clinicId, onStatusChange, onToggle }: TaskRowProps) {
  const [open, setOpen] = useState(false)

  if (task.is_tbd) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-dashed border-gray-300 rounded-lg opacity-60">
        <AlertCircle className="w-4 h-4 text-gray-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm text-gray-500 font-medium">{task.ref_id} — {task.name}</span>
        </div>
        <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-medium shrink-0">🚧 TBD</span>
      </div>
    )
  }

  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${open ? 'border-blue-200 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}>
      {/* Row header */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left bg-white hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-gray-400 shrink-0">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>

        <span className="text-xs font-mono text-gray-400 w-12 shrink-0">{task.ref_id}</span>

        <span className="flex-1 text-sm font-medium text-gray-800 truncate">{task.name}</span>

        {task.files.length > 0 && (
          <span className="text-xs text-blue-600 flex items-center gap-1 shrink-0">
            <FileText className="w-3 h-3" />
            {task.files.length}
          </span>
        )}

        <span className={`text-xs font-medium shrink-0 ${PRIORITY_COLOR[task.priority] ?? 'text-gray-400'}`}>
          {task.priority}
        </span>

        {isAdmin ? (
          <select
            className="text-xs border border-gray-200 rounded px-2 py-1 shrink-0 bg-white"
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
          <label className="flex items-center gap-1 text-xs text-gray-500 shrink-0 cursor-pointer" onClick={e => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={task.enabled ?? true}
              onChange={e => onToggle?.(task.clinic_task_id!, e.target.checked)}
              className="rounded"
            />
            Active
          </label>
        )}
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="px-4 pb-4 pt-2 bg-white border-t border-gray-100 space-y-4">
          {task.what_to_provide && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">What to provide</p>
              <p className="text-sm text-gray-700">{task.what_to_provide}</p>
            </div>
          )}

          {task.how_to_prepare && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">How to prepare</p>
              <p className="text-sm text-gray-700">{task.how_to_prepare}</p>
            </div>
          )}

          <div className="flex gap-4 flex-wrap">
            {task.data_room_path && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <FolderOpen className="w-3.5 h-3.5" />
                <span className="font-mono">{task.data_room_path}</span>
              </div>
            )}
            {task.due_week && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Calendar className="w-3.5 h-3.5" />
                <span>Due: {task.due_week}</span>
              </div>
            )}
          </div>

          {task.files.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Documents</p>
              <div className="space-y-1.5">
                {task.files.map(f => (
                  <a
                    key={f.id}
                    href={`/api/admin/clinics/${clinicId}/files/${f.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <Download className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{f.filename}</span>
                    <span className="text-xs text-gray-400 shrink-0">{new Date(f.uploaded_at).toLocaleDateString()}</span>
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
