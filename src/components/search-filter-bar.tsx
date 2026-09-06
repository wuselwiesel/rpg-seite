import Link from "next/link";

export function SearchFilterBar({
  basePath,
  q,
  from,
  to,
  tag,
}: {
  basePath: string;
  q: string;
  from: string;
  to: string;
  tag: string;
}) {
  const hasFilters = Boolean(q || from || to || tag);

  return (
    <form action={basePath} className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl bg-surface p-3">
      <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-xs text-muted">
        Suche
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Titel, Text oder #hashtag"
          className="rounded-md border border-line bg-app px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted">
        Von
        <input
          type="date"
          name="from"
          defaultValue={from}
          className="rounded-md border border-line bg-app px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted">
        Bis
        <input
          type="date"
          name="to"
          defaultValue={to}
          className="rounded-md border border-line bg-app px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent"
        />
      </label>
      {tag && <input type="hidden" name="tag" value={tag} />}
      <button
        type="submit"
        className="rounded-md bg-accent-strong px-4 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90"
      >
        Filtern
      </button>
      {tag && (
        <span className="flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1.5 text-xs text-fg-soft">
          #{tag}
        </span>
      )}
      {hasFilters && (
        <Link href={basePath} className="text-xs text-muted hover:text-accent">
          Zurücksetzen
        </Link>
      )}
    </form>
  );
}
