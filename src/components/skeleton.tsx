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

// Platzhalter in Form eines Feed-Beitrags: Kopfzeile, Bild, Aktionsleiste.
export function FeedSkeleton() {
  return (
    <div className="mx-auto max-w-[470px] px-3 pt-2" aria-busy="true" aria-label="Lädt">
      <div className="mb-3 flex gap-3 overflow-hidden">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
            <Skeleton className="h-[52px] w-[52px] rounded-full" />
            <Skeleton className="h-2.5 w-10" />
          </div>
        ))}
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="-mx-3 mb-4 sm:mx-0">
          <div className="flex items-center gap-2.5 px-3 py-2">
            <Skeleton className="h-[34px] w-[34px] rounded-full" />
            <div className="flex-1">
              <Skeleton className="mb-1.5 h-3 w-32" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          </div>
          <Skeleton className="aspect-[4/5] w-full rounded-none" />
          <div className="flex gap-4 px-3 pt-3">
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-7 w-7 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Platzhalter für Listen mit Avatar und zwei Textzeilen (Chats, kompakte Story-Liste).
export function RowListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6" aria-busy="true" aria-label="Lädt">
      <Skeleton className="mb-1.5 h-7 w-44" />
      <Skeleton className="mb-6 h-3 w-32" />
      <div className="flex flex-col gap-4">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-[52px] w-[52px] shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="mb-2 h-3.5 w-1/2" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
