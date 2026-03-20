interface LineProps {
  className?: string
}

export function SkeletonLine({ className = 'h-4 w-full' }: LineProps) {
  return <div className={`skeleton-shimmer rounded ${className}`} />
}

export function SkeletonCard() {
  return (
    <div className="bg-surface-2 rounded-2xl border border-border p-4 space-y-3">
      <SkeletonLine className="h-5 w-2/3" />
      <SkeletonLine className="h-3 w-1/2" />
      <SkeletonLine className="h-3 w-3/4" />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-surface-2 rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center px-4 py-2.5 border-b border-border gap-3">
        <SkeletonLine className="h-3 w-8" />
        <SkeletonLine className="h-3 flex-1" />
        <SkeletonLine className="h-3 w-12" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center px-4 py-3 border-b border-border/50 last:border-b-0 gap-3">
          <SkeletonLine className="h-4 w-8" />
          <SkeletonLine className="h-4 flex-1" />
          <SkeletonLine className="h-4 w-14" />
        </div>
      ))}
    </div>
  )
}
