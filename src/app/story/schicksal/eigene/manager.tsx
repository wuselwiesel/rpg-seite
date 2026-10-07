"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { RevealRow } from "@/components/reveal-row";
import { FATE_CATEGORIES, SEVERITY_ORDER } from "@/lib/fate-types";
import { analyzeFateText, previewFateText, type CustomFateRow } from "@/lib/fate-custom";
import { addCustomFate, deleteCustomFate, updateCustomFate } from "./actions";

const field = "rounded-md border border-line bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent sm:text-sm";

const SEVERITY_LABEL: Record<string, string> = { leicht: "Leicht", mittel: "Mittel", schwer: "Schwer", "sehr schwer": "Sehr schwer", extrem: "Extrem" };

export function CustomFateManager({ fates, currentUserId, isWorldOwner }: { fates: CustomFateRow[]; currentUserId: string; isWorldOwner: boolean }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [category, setCategory] = useState<string>(FATE_CATEGORIES[0]);
  const [severity, setSeverity] = useState<string>("mittel");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const area = useRef<HTMLTextAreaElement>(null);

  const analyzed = text.trim() ? analyzeFateText(text) : null;

  function insert(token: string) {
    const el = area.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = `${text.slice(0, start)}${token}${text.slice(end)}`;
    setText(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  function reset() {
    setEditingId(null);
    setText("");
    setCategory(FATE_CATEGORIES[0]);
    setSeverity("mittel");
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const error = editingId ? await updateCustomFate(editingId, { text, category, severity }) : await addCustomFate({ text, category, severity });
      if (error) return setMessage({ ok: false, text: error });
      setMessage({ ok: true, text: editingId ? "Gespeichert." : "Hinzugefügt." });
      reset();
      router.refresh();
    });
  }

  function remove(id: string) {
    setMessage(null);
    startTransition(async () => {
      const error = await deleteCustomFate(id);
      if (error) setMessage({ ok: false, text: error });
      else {
        if (editingId === id) reset();
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
        <p className="text-sm font-medium text-fg">{editingId ? "Schicksal bearbeiten" : "Neues Schicksal"}</p>
        <textarea
          ref={area}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={500}
          aria-label="Text des Schicksals"
          placeholder="z. B. {character1} findet einen Brief von {character2}."
          className={`${field} resize-y`}
        />
        <div className="flex flex-wrap gap-1.5">
          {["{character1}", "{character2}", "{character3}"].map((token, i) => (
            <button key={token} type="button" onClick={() => insert(token)} className="rounded-full bg-surface-2 px-3 py-1 text-xs text-fg-soft transition hover:text-fg">
              + Charakter {i + 1}
            </button>
          ))}
        </div>
        {analyzed && (
          <p className={`text-sm ${"error" in analyzed ? "text-red-600 dark:text-red-400" : "text-fg-soft"}`}>
            {"error" in analyzed ? analyzed.error : previewFateText(analyzed.text)}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-fg-soft">
            Kategorie
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
              {FATE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-fg-soft">
            Schweregrad
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} className={field}>
              {SEVERITY_ORDER.map((s) => (
                <option key={s} value={s}>
                  {SEVERITY_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={pending || !analyzed || "error" in analyzed}
            className="rounded-md bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:bg-surface-2 disabled:text-muted disabled:opacity-100"
          >
            {editingId ? "Speichern" : "Hinzufügen"}
          </button>
          {editingId && (
            <button type="button" onClick={reset} className="text-sm text-muted transition hover:text-fg">
              Abbrechen
            </button>
          )}
          {message && (
            <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {message.text}
            </p>
          )}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-fg">Eigene Schicksale ({fates.length})</p>
        {fates.length === 0 ? (
          <p className="text-sm text-muted">Noch keine eigenen Schicksale.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {fates.map((f) => (
              <RevealRow
                key={f.id}
                className="items-start rounded-xl bg-surface-2 px-3 py-2.5"
                actions={
                  f.created_by === currentUserId || isWorldOwner ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(f.id);
                          setText(f.text);
                          setCategory(f.category);
                          setSeverity(f.severity);
                          setMessage(null);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        aria-label="Schicksal bearbeiten"
                        className="shrink-0 rounded-full p-1 text-muted transition hover:text-fg"
                      >
                        <Pencil className="h-4 w-4" strokeWidth={2} />
                      </button>
                      <button type="button" onClick={() => remove(f.id)} aria-label="Schicksal löschen" className="shrink-0 rounded-full p-1 text-muted transition hover:text-red-500">
                        <Trash2 className="h-4 w-4" strokeWidth={2} />
                      </button>
                    </>
                  ) : null
                }
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm text-fg">{f.text}</p>
                  <p className="mt-1 text-xs text-muted">
                    {f.category} · {SEVERITY_LABEL[f.severity] ?? f.severity}
                    {f.targets > 0 ? ` · ${f.targets} weitere${f.targets === 1 ? "r" : ""} Charakter${f.targets === 1 ? "" : "e"}` : ""}
                  </p>
                </div>
              </RevealRow>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
