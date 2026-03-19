import { useEffect, useState } from 'react'
import {
  FileText, FileSpreadsheet, FileType, Presentation,
  Download, Eye, Search, FolderOpen, Calendar, Loader2,
  Trash2
} from 'lucide-react'
import FileViewer from './FileViewer'

interface DocFile {
  id: string
  filename: string
  file_size: number
  mime_type: string | null
  uploaded_at: string
  uploaded_by?: string
  task_id: string | null
  task_ref_id: string | null
  task_name: string | null
  exhibit: string | null
}

interface Props {
  clinicId: string
  isAdmin?: boolean
  onDelete?: (fileId: string) => void
}

const FILE_ICONS: Record<string, React.ReactNode> = {
  pdf:  <FileType className="w-4 h-4 text-red-500" />,
  xlsx: <FileSpreadsheet className="w-4 h-4 text-emerald-600" />,
  xls:  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />,
  csv:  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />,
  docx: <FileText className="w-4 h-4 text-blue-500" />,
  doc:  <FileText className="w-4 h-4 text-blue-500" />,
  pptx: <Presentation className="w-4 h-4 text-orange-500" />,
  ppt:  <Presentation className="w-4 h-4 text-orange-500" />,
}

function getIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  return FILE_ICONS[ext] ?? <FileText className="w-4 h-4 text-[#6b7a8d]" />
}

function formatBytes(bytes: number) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const EXHIBIT_ORDER = [
  'Financial Due Diligence', 'Legal Due Diligence', 'Lease',
  'Closing Day', 'Onboarding & Integration',
]

export default function DocumentStore({ clinicId, isAdmin, onDelete }: Props) {
  const [files, setFiles] = useState<DocFile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [viewFile, setViewFile] = useState<DocFile | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [groupBy, setGroupBy] = useState<'exhibit' | 'date' | 'type'>('exhibit')

  const load = () => {
    const url = isAdmin
      ? `/api/admin/clinics/${clinicId}/files`
      : `/api/portal/documents?clinic_id=${clinicId}`
    fetch(url)
      .then(r => r.ok ? r.json() : [])
      .then(setFiles)
      .finally(() => setLoading(false))
  }

  useEffect(load, [clinicId, isAdmin])

  const handleDelete = async (fileId: string) => {
    if (!window.confirm('Delete this file? This cannot be undone.')) return
    setDeleting(fileId)
    await fetch(`/api/admin/clinics/${clinicId}/files/${fileId}`, { method: 'DELETE' })
    setFiles(prev => prev.filter(f => f.id !== fileId))
    onDelete?.(fileId)
    setDeleting(null)
  }

  const filtered = files.filter(f =>
    !search ||
    f.filename.toLowerCase().includes(search.toLowerCase()) ||
    (f.task_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (f.exhibit || '').toLowerCase().includes(search.toLowerCase()) ||
    (f.task_ref_id || '').toLowerCase().includes(search.toLowerCase())
  )

  // Group logic
  const grouped: { label: string; files: DocFile[] }[] = (() => {
    if (groupBy === 'exhibit') {
      const byExhibit: Record<string, DocFile[]> = {}
      filtered.forEach(f => {
        const key = f.exhibit || 'Unassigned'
        if (!byExhibit[key]) byExhibit[key] = []
        byExhibit[key].push(f)
      })
      return [
        ...EXHIBIT_ORDER.filter(e => byExhibit[e]).map(e => ({ label: e, files: byExhibit[e] })),
        ...(byExhibit['Unassigned'] ? [{ label: 'Unassigned', files: byExhibit['Unassigned'] }] : []),
      ]
    }
    if (groupBy === 'type') {
      const byType: Record<string, DocFile[]> = {}
      filtered.forEach(f => {
        const ext = f.filename.split('.').pop()?.toUpperCase() || 'OTHER'
        if (!byType[ext]) byType[ext] = []
        byType[ext].push(f)
      })
      return Object.entries(byType).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({ label: k, files: v }))
    }
    // date: group by month
    const byMonth: Record<string, DocFile[]> = {}
    filtered.forEach(f => {
      const month = new Date(f.uploaded_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      if (!byMonth[month]) byMonth[month] = []
      byMonth[month].push(f)
    })
    return Object.entries(byMonth).map(([k, v]) => ({ label: k, files: v }))
  })()

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white border border-[#dde4ed] rounded-xl p-4 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] border border-[#dde4ed] rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-[#6b7a8d] shrink-0" />
          <input
            className="flex-1 text-sm outline-none text-[#1a2a38] placeholder-[#6b7a8d]"
            placeholder="Search files, tasks, sections…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {(['exhibit', 'type', 'date'] as const).map(g => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors capitalize ${
                groupBy === g ? 'bg-white text-[#1e3a4f] shadow-sm' : 'text-[#6b7a8d] hover:text-[#1a2a38]'
              }`}
            >
              {g === 'exhibit' ? 'Section' : g}
            </button>
          ))}
        </div>
        <div className="text-xs text-[#6b7a8d] shrink-0">
          {filtered.length} file{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-[#1e3a4f] animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#dde4ed] rounded-xl py-16 text-center">
          <FolderOpen className="w-10 h-10 text-[#6b7a8d]/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-[#1a2a38]">
            {search ? 'No files match your search' : 'No documents uploaded yet'}
          </p>
          {!search && isAdmin && (
            <p className="text-xs text-[#6b7a8d] mt-1">Upload files from the Tasks tab on any clinic</p>
          )}
        </div>
      ) : (
        grouped.map(({ label, files: groupFiles }) => (
          <div key={label}>
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-sm font-semibold text-[#1a2a38]">{label}</h3>
              <span className="text-xs text-[#6b7a8d] bg-gray-100 px-2 py-0.5 rounded-full">
                {groupFiles.length} file{groupFiles.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="bg-white border border-[#dde4ed] rounded-xl overflow-hidden">
              <div className="divide-y divide-[#dde4ed]/60">
                {groupFiles.map(f => (
                  <div key={f.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/50 transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 border border-[#dde4ed]/60 flex items-center justify-center shrink-0">
                      {getIcon(f.filename)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => setViewFile(f)}
                        className="text-sm font-medium text-[#1a2a38] hover:text-[#2e8fb5] transition-colors text-left truncate max-w-full block"
                      >
                        {f.filename}
                      </button>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {f.task_ref_id && (
                          <span className="text-[11px] font-mono text-[#6b7a8d]">{f.task_ref_id}</span>
                        )}
                        {f.task_name && (
                          <span className="text-[11px] text-[#6b7a8d] truncate max-w-[200px]">{f.task_name}</span>
                        )}
                        {!f.task_id && (
                          <span className="text-[11px] text-[#6b7a8d]/60 italic">No task linked</span>
                        )}
                      </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-4 text-xs text-[#6b7a8d] shrink-0">
                      <span>{formatBytes(f.file_size)}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(f.uploaded_at).toLocaleDateString()}
                      </span>
                      {isAdmin && f.uploaded_by && (
                        <span className="text-[#6b7a8d]/60">{f.uploaded_by}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setViewFile(f)}
                        className="p-1.5 rounded-lg text-[#6b7a8d] hover:text-[#2e8fb5] hover:bg-blue-50 transition-colors"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <a
                        href={`/api/admin/clinics/${clinicId}/files/${f.id}/download`}
                        download={f.filename}
                        className="p-1.5 rounded-lg text-[#6b7a8d] hover:text-[#1a2a38] hover:bg-gray-100 transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(f.id)}
                          disabled={deleting === f.id}
                          className="p-1.5 rounded-lg text-[#6b7a8d]/40 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))
      )}

      {viewFile && (
        <FileViewer
          fileId={viewFile.id}
          clinicId={clinicId}
          filename={viewFile.filename}
          onClose={() => setViewFile(null)}
        />
      )}
    </div>
  )
}
