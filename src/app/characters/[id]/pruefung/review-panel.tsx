"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { alertDialog } from "@/components/confirm-dialog";
import { decideCharacterChange, proposeCharacterChange, resubmitCharacter, reviewCharacter } from "@/app/characters/review-actions";
import type { FieldDef } from "@/lib/character-fields";

export type ProposalView = {
  id: string;
  label: string;
  oldValue: string;
  newValue: string;
  note: string;
  byName: string;
  status: "open" | "accepted" | "declined" | "withdrawn";
};

const STATUS_LABEL = { pending: "Zur Prüfung", approved: "Genehmigt", rejected: "Abgelehnt" } as const;
const STATUS_STYLE = {
  pending: "bg-accent/15 text-accent",
  approved: "bg-surface-3 text-fg-soft",
  rejected: "bg-red-500/15 text-red-600 dark:text-red-400",
} as const;
const DECIDED_LABEL = { accepted: "Übernommen", declined: "Abgelehnt", withdrawn: "Zurückgezogen", open: "" } as const;

const input = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent";
const btn = "rounded-full border border-line px-4 py-1.5 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent disabled:opacity-50";
const btnPrimary = "rounded-full bg-accent-strong px-4 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50";

function Diff({ oldValue, newValue }: { oldValue: string; newValue: string }) {
  return (
    <div className="grid gap-2 text-sm sm:grid-cols-2">
      <p className="whitespace-pre-wrap break-words rounded-lg bg-surface-2 px-3 py-2 text-fg-soft line-through decoration-fg-soft/40">{oldValue || "leer"}</p>
      <p className="whitespace-pre-wrap break-words rounded-lg bg-accent/10 px-3 py-2 text-fg">{newValue || "leer"}</p>
    </div>
  );
}

export function ReviewPanel({
  characterId,
  status,
  reviewNote,
  isAdmin,
  isOwner,
  fields,
  proposals,
}: {
  characterId: string;
  status: "pending" | "approved" | "rejected";
  reviewNote: string | null;
  isAdmin: boolean;
  isOwner: boolean;
  fields: FieldDef[];
  proposals: ProposalView[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [fieldKey, setFieldKey] = useState("");
  const [value, setValue] = useState("");
  const [proposalNote, setProposalNote] = useState("");

  const field = fields.find((f) => f.key === fieldKey);
  const groups = useMemo(() => {
    const m = new Map<string, FieldDef[]>();
    for (const f of fields) m.set(f.group, [...(m.get(f.group) ?? []), f]);
    return [...m.entries()];
  }, [fields]);
  const open = proposals.filter((p) => p.status === "open");
  const decided = proposals.filter((p) => p.status !== "open");

  function run(job: () => Promise<string | null>, after?: () => void) {
    startTransition(async () => {
      const error = await job();
      if (error) {
        void alertDialog(error);
        return;
      }
      after?.();
      router.refresh();
    });
  }

  function pickField(key: string) {
    setFieldKey(key);
    setValue(fields.find((f) => f.key === key)?.value ?? "");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>
        {reviewNote && <p className="min-w-0 break-words text-sm text-fg">{reviewNote}</p>}
      </div>

      {isOwner && status === "rejected" && (
        <div>
          <button type="button" disabled={pending} onClick={() => run(() => resubmitCharacter(characterId))} className={btnPrimary}>
            Erneut einreichen
          </button>
        </div>
      )}

      {isAdmin && (
        <section aria-label="Entscheidung" className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {status !== "approved" && (
              <button type="button" disabled={pending} onClick={() => run(() => reviewCharacter(characterId, "approved", ""))} className={btnPrimary}>
                Genehmigen
              </button>
            )}
            {status !== "rejected" && (
              <button type="button" disabled={pending} onClick={() => setRejecting((v) => !v)} aria-expanded={rejecting} className={btn}>
                Ablehnen
              </button>
            )}
          </div>
          {rejecting && (
            <div className="flex flex-col gap-2">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} placeholder="Was soll geändert werden?" aria-label="Hinweis zur Ablehnung" className={input} />
              <div>
                <button
                  type="button"
                  disabled={pending || !note.trim()}
                  onClick={() =>
                    run(
                      () => reviewCharacter(characterId, "rejected", note),
                      () => {
                        setRejecting(false);
                        setNote("");
                      },
                    )
                  }
                  className={btnPrimary}
                >
                  Ablehnen senden
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {open.length > 0 && (
        <section aria-label="Offene Vorschläge" className="flex flex-col gap-3">
          <h2 className="font-serif text-xl text-fg">Vorschläge</h2>
          <ul className="flex flex-col gap-3">
            {open.map((p) => (
              <li key={p.id} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-fg">{p.label}</span>
                  <span className="text-xs text-muted">von {p.byName}</span>
                </div>
                <Diff oldValue={p.oldValue} newValue={p.newValue} />
                {p.note && <p className="text-sm text-fg-soft">{p.note}</p>}
                <div className="flex flex-wrap gap-2">
                  {isOwner && (
                    <>
                      <button type="button" disabled={pending} onClick={() => run(() => decideCharacterChange(p.id, "accepted"))} className={btnPrimary}>
                        Übernehmen
                      </button>
                      <button type="button" disabled={pending} onClick={() => run(() => decideCharacterChange(p.id, "declined"))} className={btn}>
                        Ablehnen
                      </button>
                    </>
                  )}
                  {isAdmin && !isOwner && (
                    <button type="button" disabled={pending} onClick={() => run(() => decideCharacterChange(p.id, "withdrawn"))} className={btn}>
                      Zurückziehen
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isAdmin && (
        <section aria-label="Änderung vorschlagen" className="flex flex-col gap-3">
          <h2 className="font-serif text-xl text-fg">Änderung vorschlagen</h2>
          <select value={fieldKey} onChange={(e) => pickField(e.target.value)} aria-label="Feld" className={input}>
            <option value="">Feld wählen</option>
            {groups.map(([group, list]) => (
              <optgroup key={group} label={group}>
                {list.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {field && (
            <>
              <Diff oldValue={field.value} newValue={value} />
              {field.kind === "select" ? (
                <select value={value} onChange={(e) => setValue(e.target.value)} aria-label="Neuer Wert" className={input}>
                  {(field.options ?? []).map((o) => (
                    <option key={o} value={o}>
                      {o || "leer"}
                    </option>
                  ))}
                </select>
              ) : field.kind === "long" ? (
                <textarea value={value} onChange={(e) => setValue(e.target.value)} rows={6} aria-label="Neuer Wert" className={input} />
              ) : (
                <input type="text" inputMode={field.kind === "number" ? "numeric" : undefined} value={value} onChange={(e) => setValue(e.target.value)} aria-label="Neuer Wert" className={input} />
              )}
              <input type="text" value={proposalNote} onChange={(e) => setProposalNote(e.target.value)} maxLength={500} placeholder="Hinweis (optional)" aria-label="Hinweis" className={input} />
              <div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => proposeCharacterChange(characterId, field.key, value, proposalNote),
                      () => {
                        setFieldKey("");
                        setValue("");
                        setProposalNote("");
                      },
                    )
                  }
                  className={btnPrimary}
                >
                  Vorschlagen
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {decided.length > 0 && (
        <section aria-label="Erledigt" className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-fg">Erledigt</h2>
          <ul className="flex flex-col gap-2">
            {decided.map((p) => (
              <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-line px-3 py-2 text-sm">
                <span className="min-w-0 truncate text-fg">{p.label}</span>
                <span className="text-xs text-muted">{DECIDED_LABEL[p.status]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
