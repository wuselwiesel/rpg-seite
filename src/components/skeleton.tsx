export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-surface-2 ${className}`} />;
}

export function ListPageSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Skeleton className="mb-2 h-9 w-48" />
      <Skeleton className="mb-6 h-4 w-64" />
      <Skeleton className="mb-6 h-16 w-full rounded-2xl" />
      <div className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl bg-surface-2 p-5">
            <Skeleton className="mb-3 h-9 w-9 rounded-full bg-surface-3" />
            <Skeleton className="mb-2 h-6 w-2/3 bg-surface-3" />
            <Skeleton className="h-4 w-full bg-surface-3" />
          </div>
        ))}
      </div>
    </div>
  );
}
