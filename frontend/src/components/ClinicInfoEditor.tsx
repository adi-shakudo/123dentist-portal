import { useState, useEffect } from 'react'
import { Plus, Trash2, GripVertical, User, Phone, Mail, Briefcase, Save, Loader2 } from 'lucide-react'

interface DetailField { label: string; value: string }
interface Contact { name: string; role: string; email: string; phone: string }
interface Info { details: DetailField[]; contacts: Contact[] }

interface Props {
  clinicId: string
  readOnly?: boolean
}

const DEFAULT_DETAILS: DetailField[] = [
  { label: 'HQ Address', value: '' },
  { label: 'Phone Number', value: '' },
  { label: 'Email', value: '' },
  { label: 'Website', value: '' },
]

function emptyContact(): Contact {
  return { name: '', role: '', email: '', phone: '' }
}

export default function ClinicInfoEditor({ clinicId, readOnly }: Props) {
  const [info, setInfo] = useState<Info>({ details: [], contacts: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const apiBase = readOnly
    ? `/api/portal/info?clinic_id=${clinicId}`
    : `/api/admin/clinics/${clinicId}/info`

  useEffect(() => {
    const url = readOnly ? `/api/portal/info?clinic_id=${clinicId}` : `/api/admin/clinics/${clinicId}/info`
    fetch(url)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setInfo({
            details: d.details?.length ? d.details : (readOnly ? [] : DEFAULT_DETAILS),
            contacts: d.contacts || [],
          })
        }
      })
      .finally(() => setLoading(false))
  }, [clinicId])

  const save = async () => {
    setSaving(true)
    setSaved(false)
    await fetch(`/api/admin/clinics/${clinicId}/info`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ details: info.details, contacts: info.contacts }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const updateDetail = (i: number, field: keyof DetailField, val: string) => {
    setInfo(prev => ({ ...prev, details: prev.details.map((d, idx) => idx === i ? { ...d, [field]: val } : d) }))
    setSaved(false)
  }

  const addDetail = () => {
    setInfo(prev => ({ ...prev, details: [...prev.details, { label: 'New Field', value: '' }] }))
  }

  const removeDetail = (i: number) => {
    setInfo(prev => ({ ...prev, details: prev.details.filter((_, idx) => idx !== i) }))
    setSaved(false)
  }

  const updateContact = (i: number, field: keyof Contact, val: string) => {
    setInfo(prev => ({ ...prev, contacts: prev.contacts.map((c, idx) => idx === i ? { ...c, [field]: val } : c) }))
    setSaved(false)
  }

  const addContact = () => {
    setInfo(prev => ({ ...prev, contacts: [...prev.contacts, emptyContact()] }))
  }

  const removeContact = (i: number) => {
    setInfo(prev => ({ ...prev, contacts: prev.contacts.filter((_, idx) => idx !== i) }))
    setSaved(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-[#1e3a4f] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">

      {/* ── Clinic Details ─────────────────────────────────────── */}
      <div className="bg-white border border-[#dde4ed] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#dde4ed] flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-[#1a2a38]">Clinic Details</h3>
            {!readOnly && <p className="text-xs text-[#6b7a8d] mt-0.5">Add and edit any field you need</p>}
          </div>
          {!readOnly && (
            <button onClick={addDetail} className="flex items-center gap-1.5 text-xs text-[#2e8fb5] hover:text-[#1e3a4f] font-medium transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Field
            </button>
          )}
        </div>

        {info.details.length === 0 ? (
          <div className="px-6 py-8 text-center text-[#6b7a8d] text-sm">
            {readOnly ? 'No details have been added yet.' : 'No fields yet. Click "Add Field" to start.'}
          </div>
        ) : (
          <div className="divide-y divide-[#dde4ed]/60">
            {info.details.map((d, i) => (
              <div key={i} className="flex items-center gap-3 px-6 py-3">
                {!readOnly && <GripVertical className="w-4 h-4 text-[#6b7a8d]/40 shrink-0 cursor-grab" />}

                {readOnly ? (
                  <>
                    <span className="text-xs font-semibold text-[#6b7a8d] uppercase tracking-wide w-36 shrink-0">{d.label}</span>
                    <span className="text-sm text-[#1a2a38] flex-1">{d.value || <span className="text-[#6b7a8d]/50 italic">—</span>}</span>
                  </>
                ) : (
                  <>
                    <input
                      className="text-xs font-semibold text-[#6b7a8d] uppercase tracking-wide bg-gray-50 border border-[#dde4ed] rounded-md px-2 py-1 w-40 shrink-0 focus:outline-none focus:ring-1 focus:ring-[#2e8fb5]"
                      value={d.label}
                      onChange={e => updateDetail(i, 'label', e.target.value)}
                    />
                    <input
                      className="text-sm text-[#1a2a38] flex-1 border border-[#dde4ed] rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2e8fb5] bg-white"
                      placeholder="Enter value..."
                      value={d.value}
                      onChange={e => updateDetail(i, 'value', e.target.value)}
                    />
                    <button onClick={() => removeDetail(i)} className="text-[#6b7a8d]/40 hover:text-red-500 transition-colors shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Key Contacts ───────────────────────────────────────── */}
      <div className="bg-white border border-[#dde4ed] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#dde4ed] flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-[#1a2a38]">Key Contacts</h3>
            {!readOnly && <p className="text-xs text-[#6b7a8d] mt-0.5">Add the people involved in this clinic's acquisition</p>}
          </div>
          {!readOnly && (
            <button onClick={addContact} className="flex items-center gap-1.5 text-xs text-[#2e8fb5] hover:text-[#1e3a4f] font-medium transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Contact
            </button>
          )}
        </div>

        {info.contacts.length === 0 ? (
          <div className="px-6 py-8 text-center text-[#6b7a8d] text-sm">
            {readOnly ? 'No contacts have been added yet.' : 'No contacts yet. Click "Add Contact" to start.'}
          </div>
        ) : (
          <div className="divide-y divide-[#dde4ed]/60">
            {info.contacts.map((c, i) => (
              <div key={i} className="px-6 py-4">
                {readOnly ? (
                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-full bg-[#1e3a4f]/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-[#1e3a4f]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1a2a38]">{c.name || <span className="text-[#6b7a8d]/50 italic">Unnamed</span>}</p>
                      {c.role && <p className="text-xs text-[#6b7a8d] mt-0.5">{c.role}</p>}
                      <div className="flex flex-wrap gap-4 mt-2">
                        {c.email && (
                          <a href={'mailto:' + c.email} className="flex items-center gap-1.5 text-xs text-[#2e8fb5] hover:underline">
                            <Mail className="w-3 h-3" />{c.email}
                          </a>
                        )}
                        {c.phone && (
                          <a href={'tel:' + c.phone} className="flex items-center gap-1.5 text-xs text-[#6b7a8d]">
                            <Phone className="w-3 h-3" />{c.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-[#6b7a8d] uppercase tracking-wide block mb-1">Name</label>
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-[#6b7a8d]/50 shrink-0" />
                        <input className="flex-1 text-sm border border-[#dde4ed] rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2e8fb5]"
                          placeholder="Full name" value={c.name} onChange={e => updateContact(i, 'name', e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#6b7a8d] uppercase tracking-wide block mb-1">Role / Title</label>
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-3.5 h-3.5 text-[#6b7a8d]/50 shrink-0" />
                        <input className="flex-1 text-sm border border-[#dde4ed] rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2e8fb5]"
                          placeholder="e.g. Principal Dentist" value={c.role} onChange={e => updateContact(i, 'role', e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#6b7a8d] uppercase tracking-wide block mb-1">Email</label>
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-[#6b7a8d]/50 shrink-0" />
                        <input className="flex-1 text-sm border border-[#dde4ed] rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2e8fb5]"
                          placeholder="email@clinic.com" type="email" value={c.email} onChange={e => updateContact(i, 'email', e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#6b7a8d] uppercase tracking-wide block mb-1">Phone</label>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-[#6b7a8d]/50 shrink-0" />
                        <input className="flex-1 text-sm border border-[#dde4ed] rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2e8fb5]"
                          placeholder="+1 (555) 000-0000" value={c.phone} onChange={e => updateContact(i, 'phone', e.target.value)} />
                      </div>
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <button onClick={() => removeContact(i)} className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" /> Remove contact
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save bar */}
      {!readOnly && (
        <div className="flex items-center justify-end gap-3">
          {saved && <span className="text-sm text-emerald-600 font-medium">Saved</span>}
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 bg-[#1e3a4f] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#284d65] disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  )
}
