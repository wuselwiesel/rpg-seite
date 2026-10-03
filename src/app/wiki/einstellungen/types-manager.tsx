"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { createWikiType, deleteWikiType, updateWikiType } from "./actions";
import { CustomEmojiPicker } from "@/components/custom-emoji-picker";
import { TypeGlyph } from "@/components/wiki-type-icon";
import { FOLDER_COLORS, folderColorHex } from "@/lib/wiki-folder-style";
import { STANDARD_TYPE_ICONS, type WikiType } from "@/lib/wiki-types";

type Row = { type: WikiType; count: number; canDelete: boolean };

const input = "rounded-lg border border-line bg-app px-3 py-2 text-fg outline-none focus:border-accent";

// Liste aller Seitenarten der Welt mit Bearbeiten, Löschen und „Neue Art“.
export function TypesManager({ rows }: { rows: Row[] }) {
  const [editing, setEditing] = useState<WikiType | "new" | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);

  return (
    <>
      <div className="flex flex-col gap-3">
        <ul className="flex flex-col gap-2">
          {rows.map(({ type, count, canDelete }) => (
            <li key={type.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
                style={{ backgroundColor: `color-mix(in srgb, ${folderColorHex(type.color) ?? "var(--muted)"} 20%, transparent)` }}
              >
                <TypeGlyph type={type} className="h-5 w-5" colored />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-fg">{type.label}</p>
                <p className="truncate text-sm text-muted">
                  {count === 0 ? "Keine Seiten" : count === 1 ? "1 Seite" : `${count} Seiten`}
                  {type.hint ? ` · ${type.hint}` : ""}
                </p>
              </div>
              <button type="button" onClick={() => setEditing(type)} title="Bearbeiten" aria-label={`${type.label} bearbeiten`} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg">
                <Pencil className="h-4 w-4" strokeWidth={2} />
              </button>
              {canDelete && (
                <button type="button" onClick={() => setDeleting({ type, count, canDelete })} title="Löschen" aria-label={`${type.label} löschen`} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-red-500">
                  <Trash2 className="h-4 w-4" strokeWidth={2} />
                </button>
              )}
            </li>
          ))}
          {rows.length === 0 && <li className="rounded-2xl border border-dashed border-line p-6 text-center text-muted">Noch keine Seitenarten. Lege die erste an.</li>}
        </ul>
        <div>
          <button type="button" onClick={() => setEditing("new")} className="flex items-center gap-1.5 rounded-lg bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90">
            <Plus className="h-4 w-4" strokeWidth={2.25} />
            Neue Art
          </button>
        </div>
      </div>
      {editing && <TypeDialog key={editing === "new" ? "new" : editing.id} type={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {deleting && <DeleteDialog row={deleting} onClose={() => setDeleting(null)} />}
    </>
  );
}

function Shell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto bg-black/40 p-4 sm:items-center" role="presentation" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        className="my-4 flex w-full max-w-lg flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-xl"
      >
        <h2 className="font-serif text-xl text-fg">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function TypeDialog({ type, onClose }: { type: WikiType | null; onClose: () => void }) {
  const router = useRouter();
  const action = type ? updateWikiType.bind(null, type.id) : createWikiType;
  const [error, formAction, pending] = useActionState(
    async (prev: string | null, formData: FormData) => {
      const result = await action(prev, formData);
      if (!result) {
        router.refresh();
        onClose();
      }
      return result;
    },
    null,
  );
  const [icon, setIcon] = useState(type?.icon ?? "file-text");
  const [color, setColor] = useState(type?.color ?? "");
  const preview: WikiType = { id: "x", label: "", plural: "", icon, color: color || null, hint: "", fields: [], outline: [], portrait: false };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <Shell title={type ? `„${type.label}“ bearbeiten` : "Neue Seitenart"} onClose={onClose}>
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="icon" value={icon} />
        <input type="hidden" name="color" value={color} />
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Name
          <input name="label" required maxLength={40} defaultValue={type?.label ?? ""} placeholder="z. B. Zauber" autoFocus className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Mehrzahl
          <input name="plural" maxLength={60} defaultValue={type?.plural ?? ""} placeholder="z. B. Zauber und Rituale (sonst wie der Name)" className={input} />
        </label>

        <div className="flex flex-col gap-1.5 text-sm text-fg-soft">
          Symbol
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-app text-xl">
              <TypeGlyph type={preview} className="h-5 w-5" colored />
            </span>
            {STANDARD_TYPE_ICONS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIcon(i)}
                aria-pressed={icon === i}
                aria-label={`Symbol ${i}`}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${icon === i ? "border-accent bg-accent/10 text-fg" : "border-line text-fg-soft hover:bg-surface-2"}`}
              >
                <TypeGlyph type={{ ...preview, icon: i }} className="h-4 w-4" />
              </button>
            ))}
            <CustomEmojiPicker
              direction="down"
              onPick={(token) => setIcon(token.trim().slice(0, 40) || "file-text")}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm text-fg-soft transition hover:bg-surface-2 hover:text-fg"
            />
          </div>
        </div>

        <fieldset className="flex flex-col gap-1.5 text-sm text-fg-soft">
          <legend className="mb-1">Farbe (für Graph und Symbole)</legend>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setColor("")} aria-pressed={color === ""} title="Keine" className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs text-muted ${color === "" ? "border-accent ring-2 ring-accent/40" : "border-line"}`}>
              –
            </button>
            {FOLDER_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setColor(c.id)}
                aria-pressed={color === c.id}
                aria-label={c.label}
                title={c.label}
                className={`h-7 w-7 rounded-full border-2 ${color === c.id ? "border-fg ring-2 ring-accent/40" : "border-transparent"}`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Beschreibung (erscheint beim Auswählen)
          <input name="hint" maxLength={120} defaultValue={type?.hint ?? ""} placeholder="z. B. Zauber, Rituale, magische Regeln" className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Steckbrief-Felder (eins pro Zeile)
          <textarea name="fields" rows={4} defaultValue={(type?.fields ?? []).join("\n")} placeholder={"Schule\nReichweite\nDauer"} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Gliederung des Textes (eine Überschrift pro Zeile)
          <textarea name="outline" rows={4} defaultValue={(type?.outline ?? []).join("\n")} placeholder={"Wirkung\nGeschichte\nRisiken"} className={input} />
        </label>
        <label className="flex items-center gap-2 text-sm text-fg-soft">
          <input type="checkbox" name="portrait" defaultChecked={type?.portrait ?? false} className="h-4 w-4 accent-[var(--accent)]" />
          Bild im Hochformat zeigen (wie bei Personen)
        </label>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-fg-soft transition hover:bg-surface-2">
            Abbrechen
          </button>
          <button type="submit" disabled={pending} className="rounded-lg bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50">
            {pending ? "…" : type ? "Speichern" : "Anlegen"}
          </button>
        </div>
      </form>
    </Shell>
  );
}

function DeleteDialog({ row, onClose }: { row: Row; onClose: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <Shell title={`„${row.type.label}“ löschen`} onClose={onClose}>
      <p className="text-sm text-fg-soft">
        {row.count > 0
          ? `${row.count === 1 ? "Die eine Seite" : `Die ${row.count} Seiten`} dieser Art bleibt mit ganzem Inhalt erhalten und hat danach keine Art mehr.`
          : "Diese Art wird von keiner Seite benutzt."}
      </p>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-fg-soft transition hover:bg-surface-2">
          Abbrechen
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const err = await deleteWikiType(row.type.id);
              if (err) return setError(err);
              router.refresh();
              onClose();
            })
          }
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "…" : "Löschen"}
        </button>
      </div>
    </Shell>
  );
}
