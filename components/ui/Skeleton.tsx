export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />
}

export function SkeletonCard() {
  return (
    <div className="card p-4 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  )
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Stat tile matching the final icon+label+value hierarchy. */
export function SkeletonStat() {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="mt-2 h-7 w-14" />
      <Skeleton className="mt-1.5 h-3 w-24" />
    </div>
  )
}

/** Task row matching the checkbox + title/meta + badges composition. */
export function SkeletonTaskRow() {
  return (
    <div className="flex items-center gap-3 p-4">
      <Skeleton className="h-5 w-5 rounded-md" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-5 w-14 rounded-full" />
      <Skeleton className="h-5 w-7 rounded-full" />
      <Skeleton className="h-8 w-8 rounded-md" />
    </div>
  )
}

export function SkeletonTaskList({ rows = 6 }: { rows?: number }) {
  return (
    <div className="card divide-y p-0">
      {Array.from({ length: rows }).map((_, i) => <SkeletonTaskRow key={i} />)}
    </div>
  )
}

/** Resource card: icon tile, title, description, meta row, action button. */
export function SkeletonResourceCard() {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-6 w-6 rounded-md" />
      </div>
      <Skeleton className="mt-3 h-4 w-3/5" />
      <Skeleton className="mt-1.5 h-3 w-full" />
      <Skeleton className="mt-1 h-3 w-4/5" />
      <div className="mt-3 flex items-center justify-between border-t pt-2.5">
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="h-2.5 w-16" />
      </div>
      <Skeleton className="mt-2.5 h-8 w-full rounded-[10px]" />
    </div>
  )
}

/** Note card: kind badge row, title, two content lines, meta row. */
export function SkeletonNoteCard() {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-3 w-6" />
      </div>
      <Skeleton className="mt-2.5 h-4 w-3/5" />
      <Skeleton className="mt-2 h-3 w-full" />
      <Skeleton className="mt-1 h-3 w-5/6" />
      <div className="mt-3 flex items-center gap-1.5 border-t pt-2.5">
        <Skeleton className="h-3 w-3 rounded" />
        <Skeleton className="h-2.5 w-32" />
      </div>
    </div>
  )
}
