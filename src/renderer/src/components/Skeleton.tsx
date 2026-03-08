/**
 * Skeleton loading components for smooth UX while data loads.
 */

export function SkeletonLine({ width = '100%', height = '1rem' }: { width?: string; height?: string }) {
  return (
    <div
      className="rounded bg-muted animate-pulse"
      style={{ width, height }}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-muted" />
        <div className="space-y-2 flex-1">
          <SkeletonLine width="40%" />
          <SkeletonLine width="70%" height="1.5rem" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="card overflow-hidden p-0">
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 border-b border-border" style={{ background: 'hsl(var(--muted) / 0.5)' }}>
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLine key={i} width={i === 0 ? '30%' : '15%'} height="0.75rem" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-4 py-3 border-b border-border last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonLine key={c} width={c === 0 ? '30%' : '15%'} height="0.875rem" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonStatCards({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid gap-4 mb-6`} style={{ gridTemplateColumns: `repeat(${Math.min(count, 4)}, 1fr)` }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export function SkeletonDashboard() {
  return (
    <div className="animate-pulse">
      <SkeletonLine width="200px" height="2rem" />
      <SkeletonLine width="160px" height="0.875rem" />
      <div className="mt-6">
        <SkeletonStatCards count={4} />
      </div>
      <div className="card mt-6" style={{ height: '220px' }} />
    </div>
  )
}

export function SkeletonList() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <SkeletonLine width="150px" height="1.75rem" />
          <SkeletonLine width="250px" height="0.875rem" />
        </div>
        <SkeletonLine width="120px" height="2.25rem" />
      </div>
      <SkeletonTable rows={8} cols={5} />
    </div>
  )
}
