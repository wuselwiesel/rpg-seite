"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, Plus, Trash2, Users } from "lucide-react";
import { MAX_SECRET_ITEMS, type SecretItem } from "@/lib/secret-items";
import { cleanFieldIcon } from "@/lib/profile-fields";
import { revealSecretItem } from "@/app/wiki/secret-actions";
import { CharacterAvatar } from "./character-avatar";
import { confirmDialog } from "./confirm-dialog";

export type ShareTarget = { id: string; name: string; avatarUrl: string | null };

const field = "rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent";
type Row = SecretItem & { key: number };

// Geheime Felder: Symbol, Titel, Inhalt, dazu „Sichtbar für“ (Vertraute) und „Aufdecken“ (macht das Feld öffentlich).
// Schreibt die ganze Liste als JSON in das versteckte Feld secret_items.
export function SecretItemsEditor({
  initial,
  people,
  partnerId,
  friendId,
}: {
  initial: SecretItem[];
  people: ShareTarget[];
  partnerId?: string | null;
  friendId?: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [nextKey, setNextKey] = useState(initial.length + 1);
  const [rows, setRows] = useState<Row[]>(() => initial.map((f, i) => ({ ...f, key: i })));

  const update = (key: number, patch: Partial<SecretItem>) => setRows((r) => r.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const move = (index: number, dir: -1 | 1) =>
    setRows((r) => {
      const target = index + dir;
      if (target < 0 || target >= r.length) return r;
      const copy = [...r];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  const toggleShare = (row: Row, id: string) => update(row.key, { shared_with: row.shared_with.includes(id) ? row.shared_with.filter((x) => x !== id) : [...row.shared_with, id] });
  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? "?";

  async function reveal(row: Row) {
    if (!row.id) return;
    if (!(await confirmDialog({ message: `„${row.title}“ aufdecken? Das Feld steht danach für alle im Steckbrief.`, confirmLabel: "Aufdecken" }))) return;
    start(async () => {
      const err = await revealSecretItem(row.id!);
      if (err) return setError(err);
      setError(null);
      setRows((r) => r.filter((x) => x.key !== row.key));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="secret_items" value={JSON.stringify(rows.map((r) => ({ id: r.id, icon: r.icon, title: r.title, text: r.text, shared_with: r.shared_with })))} />
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {rows.map((row, i) => (
        <div key={row.key} className="flex flex-col gap-2 rounded-xl border border-line p-3">
          <div className="flex gap-2">
            <input value={row.icon} onChange={(e) => update(row.key, { icon: cleanFieldIcon(e.target.value) })} placeholder="🙂" aria-label="Symbol" className={`w-14 text-center ${field}`} />
            <input value={row.title} maxLength={40} onChange={(e) => update(row.key, { title: e.target.value })} placeholder="Titel" aria-label="Titel" className={`min-w-0 flex-1 ${field}`} />
            <div className="flex shrink-0 items-center">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Nach oben" className="rounded p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg disabled:opacity-30">
                <ArrowUp className="h-4 w-4" strokeWidth={2} />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Nach unten" className="rounded p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg disabled:opacity-30">
                <ArrowDown className="h-4 w-4" strokeWidth={2} />
              </button>
              <button type="button" onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))} aria-label="Feld entfernen" className="rounded p-1.5 text-muted transition hover:bg-surface-2 hover:text-red-500">
                <Trash2 className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>
          <textarea rows={2} maxLength={300} value={row.text} onChange={(e) => update(row.key, { text: e.target.value })} placeholder="Inhalt" aria-label="Inhalt" className={field} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <details className="min-w-0 flex-1">
              <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-md bg-surface-2 px-3 py-1.5 text-sm text-fg-soft transition hover:text-fg [&::-webkit-details-marker]:hidden">
                <Users className="h-4 w-4" strokeWidth={2} />
                {row.shared_with.length === 0 ? "Nur für mich" : `Sichtbar für ${row.shared_with.map(nameOf).join(", ")}`}
              </summary>
              <div className="mt-2 flex flex-col gap-2 rounded-lg border border-line p-2">
                {(partnerId || friendId) && (
                  <div className="flex flex-wrap gap-1.5">
                    {partnerId && people.some((p) => p.id === partnerId) && (
                      <button type="button" onClick={() => toggleShare(row, partnerId)} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-fg-soft transition hover:text-fg">
                        Partner:in
                      </button>
                    )}
                    {friendId && people.some((p) => p.id === friendId) && (
                      <button type="button" onClick={() => toggleShare(row, friendId)} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-fg-soft transition hover:text-fg">
                        Beste:r Freund:in
                      </button>
                    )}
                  </div>
                )}
                <ul className="grid max-h-48 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
                  {people.map((p) => (
                    <li key={p.id}>
                      <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm text-fg hover:bg-surface-2">
                        <input type="checkbox" checked={row.shared_with.includes(p.id)} onChange={() => toggleShare(row, p.id)} className="h-4 w-4 accent-[var(--accent-strong)]" />
                        <CharacterAvatar name={p.name} avatarUrl={p.avatarUrl} size={22} />
                        <span className="min-w-0 truncate">{p.name}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
            {row.id && (
              <button type="button" disabled={pending} onClick={() => void reveal(row)} className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-fg-soft transition hover:bg-surface-2 hover:text-fg disabled:opacity-40">
                <Eye className="h-4 w-4" strokeWidth={2} />
                Aufdecken
              </button>
            )}
          </div>
        </div>
      ))}
      {rows.length < MAX_SECRET_ITEMS && (
        <button
          type="button"
          onClick={() => {
            setRows((r) => [...r, { icon: "", title: "", text: "", shared_with: [], key: nextKey }]);
            setNextKey((k) => k + 1);
          }}
          className="flex w-fit items-center gap-1.5 rounded-md bg-surface-2 px-3 py-1.5 text-sm font-medium text-fg-soft transition hover:text-fg"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Feld hinzufügen
        </button>
      )}
    </div>
  );
}
