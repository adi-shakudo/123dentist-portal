const STATUS_STYLES: Record<string, string> = {
  'Not Started':           'bg-gray-100 text-gray-600',
  'Submitted':             'bg-blue-50 text-blue-700',
  'Sent Back for Revision':'bg-amber-50 text-amber-700',
  'Complete':              'bg-emerald-50 text-emerald-700',
}

const STATUS_DOT: Record<string, string> = {
  'Not Started':           'bg-gray-400',
  'Submitted':             'bg-blue-500',
  'Sent Back for Revision':'bg-amber-500',
  'Complete':              'bg-emerald-500',
}

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status] ?? 'bg-gray-400'}`} />
      {status}
    </span>
  )
}
