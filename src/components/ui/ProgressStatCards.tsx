import type { HierarchyProgress } from '@/lib/hierarchy-progress'

type Stat = {
  key: keyof HierarchyProgress
  label: string
  singular: string
  done: number
  total: number
  accent: string
}

type Props = {
  progress: HierarchyProgress
  /** When true, emphasise remaining work for new learners. */
  emphasiseRemaining?: boolean
}

function ProgressRing({
  done,
  total,
  accent,
  label,
}: {
  done: number
  total: number
  accent: string
  label: string
}) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)
  const size = 88
  const stroke = 8
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - percent / 100)

  return (
    <div
      className="progress-ring"
      role="img"
      aria-label={`${label}: ${done} of ${total} complete, ${percent} percent`}
      title={`${done} / ${total} · ${percent}%`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="progress-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          className="progress-ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          stroke={accent}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="progress-ring-percent" aria-hidden="true">
        {percent}%
      </span>
    </div>
  )
}

export function ProgressStatCards({ progress, emphasiseRemaining = false }: Props) {
  const stats: Stat[] = [
    {
      key: 'chapters',
      label: 'Chapters',
      singular: 'chapter',
      done: progress.chapters.done,
      total: progress.chapters.total,
      accent: 'var(--brand)',
    },
    {
      key: 'sections',
      label: 'Sections',
      singular: 'section',
      done: progress.sections.done,
      total: progress.sections.total,
      accent: 'var(--ok)',
    },
    {
      key: 'lessons',
      label: 'Lessons',
      singular: 'lesson',
      done: progress.lessons.done,
      total: progress.lessons.total,
      accent: 'var(--accent)',
    },
  ]

  return (
    <ul className="progress-stat-grid">
      {stats.map((stat) => {
        const remaining = Math.max(0, stat.total - stat.done)
        const remUnit = remaining === 1 ? stat.singular : `${stat.singular}s`
        const allUnit = stat.total === 1 ? stat.singular : `${stat.singular}s`
        return (
          <li key={stat.key} className="progress-stat-card">
            <ProgressRing
              done={stat.done}
              total={stat.total}
              accent={stat.accent}
              label={stat.label}
            />
            <div className="progress-stat-copy">
              <strong className="progress-stat-label">{stat.label}</strong>
              <p className="progress-stat-count">
                <span className="progress-stat-done">{stat.done}</span>
                <span className="muted"> / {stat.total}</span>
              </p>
              <p className="muted progress-stat-hint">
                {stat.done === stat.total && stat.total > 0
                  ? `All ${allUnit} complete`
                  : emphasiseRemaining && stat.done === 0
                    ? `${remaining} ${remUnit} to explore`
                    : `${remaining} ${remUnit} remaining`}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
