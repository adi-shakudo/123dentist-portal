interface ProgressBarProps {
  pct: number
  complete: number
  total: number
  label?: string
  size?: 'sm' | 'lg'
}

export default function ProgressBar({ pct, complete, total, label, size = 'lg' }: ProgressBarProps) {
  return (
    <div>
      {label && <p className="text-xs text-gray-500 mb-1">{label}</p>}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${size === 'lg' ? 'h-3' : 'h-1.5'}`}>
        <div
          className="bg-blue-600 h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {size === 'lg' && (
        <div className="flex justify-between items-center mt-1">
          <span className="text-sm text-gray-500">{complete} of {total} tasks complete</span>
          <span className="text-sm font-semibold text-blue-700">{pct}%</span>
        </div>
      )}
    </div>
  )
}
