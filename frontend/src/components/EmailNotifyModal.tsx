import { useState, useEffect } from 'react'
import { X, Send, Mail, Loader2 } from 'lucide-react'

interface Task {
  clinic_task_id: string
  ref_id: string
  name: string
  what_to_provide?: string
  due_week?: string
  exhibit: string
}

interface Props {
  task: Task
  clinicId: string
  clinicName: string
  clinicEmail: string
  portalUrl: string
  onClose: () => void
}

export default function EmailNotifyModal({ task, clinicId, clinicName, clinicEmail, portalUrl, onClose }: Props) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setSubject(`Action Required: ${task.ref_id} — ${task.name}`)
    const dueLine = task.due_week ? `\nDue: ${task.due_week}` : ''
    const whatLine = task.what_to_provide
      ? `\nWhat to provide:\n${task.what_to_provide}`
      : ''
    setBody(
      `Dear ${clinicName},\n\nWe're reaching out regarding your onboarding checklist. The following item requires your attention:\n\n${task.ref_id} — ${task.name}\nSection: ${task.exhibit}${dueLine}${whatLine}\n\nPlease log in to your portal to review the full instructions and submit the required documents:\n${portalUrl}\n\nIf you have any questions, please don't hesitate to reach out to your 123Dentist onboarding contact.\n\nBest regards,\nThe 123Dentist Onboarding Team`
    )
  }, [task, clinicName, portalUrl])

  const send = async () => {
    setSending(true)
    setError('')
    try {
      const r = await fetch(`/api/admin/clinics/${clinicId}/tasks/${task.clinic_task_id}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body }),
      })
      if (r.ok) {
        setSent(true)
      } else {
        const d = await r.json().catch(() => ({}))
        setError(d.detail || 'Failed to send — please try again')
      }
    } catch {
      setError('Network error — could not reach the server')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#dde4ed] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1e3a4f]/10 flex items-center justify-center">
              <Mail className="w-4 h-4 text-[#1e3a4f]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1a2a38]">Send Task Notification</p>
              <p className="text-xs text-[#6b7a8d]">To: {clinicEmail}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#6b7a8d] hover:text-[#1a2a38] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {sent ? (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <Send className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-base font-semibold text-[#1a2a38] mb-1">Email sent</p>
            <p className="text-sm text-[#6b7a8d]">Notification delivered to {clinicEmail}</p>
            <button onClick={onClose} className="mt-6 bg-[#1e3a4f] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#284d65] transition-colors">
              Done
            </button>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#6b7a8d] uppercase tracking-wide block mb-1.5">Subject</label>
                <input
                  className="w-full border border-[#dde4ed] rounded-lg px-3 py-2.5 text-sm text-[#1a2a38] focus:outline-none focus:ring-2 focus:ring-[#2e8fb5] focus:border-transparent"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6b7a8d] uppercase tracking-wide block mb-1.5">Message</label>
                <textarea
                  className="w-full border border-[#dde4ed] rounded-lg px-3 py-2.5 text-sm text-[#1a2a38] focus:outline-none focus:ring-2 focus:ring-[#2e8fb5] focus:border-transparent resize-none leading-relaxed"
                  rows={14}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            </div>

            <div className="px-6 py-4 border-t border-[#dde4ed] flex items-center justify-between gap-3 shrink-0 bg-gray-50/50">
              <p className="text-xs text-[#6b7a8d]">Sending from noreply@mg.shakudo.email</p>
              <div className="flex gap-3">
                <button onClick={onClose} className="border border-[#dde4ed] text-[#6b7a8d] px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={send}
                  disabled={sending || !subject || !body}
                  className="flex items-center gap-2 bg-[#1e3a4f] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#284d65] disabled:opacity-50 transition-colors"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? 'Sending…' : 'Send Email'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
