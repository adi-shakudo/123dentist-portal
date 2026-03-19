import { useEffect, useState } from 'react'
import { X, Download, FileText, Loader2, AlertCircle } from 'lucide-react'

interface Props {
  fileId: string
  clinicId: string
  filename: string
  onClose: () => void
}

type ViewState =
  | { status: 'loading' }
  | { status: 'pdf'; url: string }
  | { status: 'office'; googleUrl: string; officeUrl: string; presignedUrl: string }
  | { status: 'error'; message: string }

export default function FileViewer({ fileId, clinicId, filename, onClose }: Props) {
  const [view, setView] = useState<ViewState>({ status: 'loading' })
  const [useOffice, setUseOffice] = useState(false)
  const ext = filename.split('.').pop()?.toLowerCase() || ''

  useEffect(() => {
    const viewUrl = `/api/admin/clinics/${clinicId}/files/${fileId}/view`

    if (['pdf'].includes(ext)) {
      setView({ status: 'pdf', url: viewUrl })
      return
    }

    fetch(viewUrl)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(data => {
        setView({
          status: 'office',
          googleUrl: data.google_viewer_url,
          officeUrl: data.office_viewer_url,
          presignedUrl: data.presigned_url,
        })
      })
      .catch(e => setView({ status: 'error', message: String(e) }))
  }, [fileId, clinicId, ext])

  const iframeUrl =
    view.status === 'pdf' ? view.url :
    view.status === 'office' ? (useOffice ? view.officeUrl : view.googleUrl) : ''

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden w-full max-w-5xl"
        style={{ height: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#dde4ed] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#1e3a4f]/10 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-[#1e3a4f]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#1a2a38] truncate">{filename}</p>
              <p className="text-xs text-[#6b7a8d]">{ext.toUpperCase()} document</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            {view.status === 'office' && (
              <button
                onClick={() => setUseOffice(u => !u)}
                className="text-xs text-[#2e8fb5] hover:text-[#1e3a4f] font-medium px-2 py-1 rounded transition-colors"
              >
                Switch to {useOffice ? 'Google Viewer' : 'Office Viewer'}
              </button>
            )}
            <a
              href={view.status === 'pdf' ? view.url : view.status === 'office' ? view.presignedUrl : '#'}
              download={filename}
              className="flex items-center gap-1.5 text-xs text-[#6b7a8d] hover:text-[#1a2a38] border border-[#dde4ed] rounded-lg px-3 py-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </a>
            <button onClick={onClose} className="text-[#6b7a8d] hover:text-[#1a2a38] transition-colors p-1.5">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden bg-gray-100">
          {view.status === 'loading' && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="w-8 h-8 text-[#1e3a4f] animate-spin" />
              <p className="text-sm text-[#6b7a8d]">Loading document…</p>
            </div>
          )}
          {view.status === 'error' && (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-sm font-medium text-[#1a2a38]">Could not load document</p>
              <p className="text-xs text-[#6b7a8d]">{view.message}</p>
            </div>
          )}
          {(view.status === 'pdf' || view.status === 'office') && (
            <iframe
              key={iframeUrl}
              src={iframeUrl}
              className="w-full h-full border-0"
              title={filename}
              allow="fullscreen"
            />
          )}
        </div>
      </div>
    </div>
  )
}
