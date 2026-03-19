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
      {label && <p className="text-xs text-[#6b7a8d] mb-1">{label}</p>}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${size === 'lg' ? 'h-2.5' : 'h-1.5'}`}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: '#1e3a4f' }}
        />
      </div>
      {size === 'lg' && (
        <div className="flex justify-between items-center mt-1.5">
          <span className="text-sm text-[#6b7a8d]">{complete} of {total} tasks complete</span>
          <span className="text-sm font-semibold text-[#1e3a4f]">{pct}%</span>
        </div>
      )}
    </div>
  )
}
