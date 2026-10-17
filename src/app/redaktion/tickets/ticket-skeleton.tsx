// Platzhalter, solange Liste oder Ticket laden
export function ListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Lädt" className="flex animate-pulse flex-col gap-3">
      <div className="flex items-center justify-between px-4">
        <div className="h-7 w-24 rounded-md bg-surface-2" />
        <div className="h-8 w-16 rounded-full bg-surface-2" />
      </div>
      <div className="mx-4 h-9 rounded-lg bg-surface-2" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex flex-col gap-1.5 border-t border-line px-4 py-3">
          <div className="h-4 w-4/5 rounded bg-surface-2" />
          <div className="h-3 w-2/5 rounded bg-surface-2" />
        </div>
      ))}
    </div>
  );
}

export function ThreadSkeleton() {
  return (
    <div aria-busy="true" aria-label="Lädt" className="mx-auto flex max-w-2xl animate-pulse flex-col gap-4 px-4 py-6 sm:py-10">
      <div className="h-3 w-24 rounded bg-surface-2" />
      <div className="h-7 w-3/4 rounded-md bg-surface-2" />
      <div className="h-8 w-full rounded bg-surface-2" />
      {[0, 1].map((i) => (
        <div key={i} className="flex gap-3">
          <div className="h-7 w-7 shrink-0 rounded-full bg-surface-2" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-surface-2" />
            <div className="h-4 w-full rounded bg-surface-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
