type Props = {
  value: number
  max?: number
  label: string
}

export function ProgressBar({ value, max = 100, label }: Props) {
  const percent = max === 0 ? 0 : Math.round((value / max) * 100)

  return (
    <div className="progress" role="group" aria-label={label}>
      <div className="progress-meta">
        <span>{label}</span>
        <span>
          {percent}% · {value} / {max} lessons
        </span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={`${label}: ${percent} percent`}
      >
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
