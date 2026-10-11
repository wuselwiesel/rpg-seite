"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, Eye, EyeOff } from "lucide-react";
import { FAMILY_ROLES, REL_CATEGORIES, categoryInfo, guessRelation } from "@/lib/relationships";
import type { Character, CharacterRelationship, RelationshipCategory } from "@/lib/types";

const field = "rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent";
const DIRECTIONAL = new Set(["eltern", "adoptiv"]);

export type RelationshipDraft = Partial<
  Pick<CharacterRelationship, "character_a_id" | "character_b_id" | "type" | "type_b" | "label" | "category" | "family_role" | "color" | "is_secret" | "ended_on" | "ended_label">
>;

// Felder zum Anlegen und Ändern einer Beziehung. Schickt sich über ein umgebendes <form> mit den üblichen Feldnamen ab.
export function RelationshipFields({
  characters,
  initial,
  lockPair = false,
  editing = false,
}: {
  characters: Character[];
  initial?: RelationshipDraft;
  // Beim Ändern bleiben die beiden Figuren fest
  lockPair?: boolean;
  editing?: boolean;
}) {
  const [aId, setAId] = useState(initial?.character_a_id ?? characters[0]?.id ?? "");
  const [bId, setBId] = useState(initial?.character_b_id ?? characters.find((c) => c.id !== (initial?.character_a_id ?? characters[0]?.id))?.id ?? "");
  const [type, setType] = useState(initial?.type ?? "");
  const [typeB, setTypeB] = useState(initial?.type_b ?? "");
  const [mutual, setMutual] = useState(!!initial?.type_b);
  const [category, setCategory] = useState<RelationshipCategory>(initial?.category ?? "freundschaft");
  const [color, setColor] = useState(initial?.color ?? categoryInfo(initial?.category ?? "freundschaft").color);
  const [role, setRole] = useState<string>(initial?.family_role ?? "verwandt");
  const [touched, setTouched] = useState(editing);
  const [secret, setSecret] = useState(!!initial?.is_secret);
  const [more, setMore] = useState(editing);
  const [ended, setEnded] = useState(!!initial?.ended_on || !!initial?.ended_label);

  const byId = useMemo(() => new Map(characters.map((c) => [c.id, c])), [characters]);
  const aName = byId.get(aId)?.name ?? "A";
  const bName = byId.get(bId)?.name ?? "B";
  const directional = category === "familie" && DIRECTIONAL.has(role);
  const info = categoryInfo(category);

  // Vorschläge: die der Art, passend zur Eingabe (alle Arten, wenn sie noch nicht gewählt wurde)
  const suggestions = useMemo(() => {
    const q = type.trim().toLowerCase();
    const pool = touched ? info.suggestions : REL_CATEGORIES.flatMap((c) => c.suggestions);
    const list = q ? pool.filter((s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q) : pool;
    return list.slice(0, 8);
  }, [type, info, touched]);

  function pickType(next: string) {
    setType(next);
    // Art und Farbe aus der Bezeichnung erkennen, solange man sie nicht selbst gewählt hat
    if (!touched) {
      const known = REL_CATEGORIES.find((c) => c.suggestions.includes(next));
      const g = guessRelation(next);
      const cat = known?.id ?? g.category;
      setCategory(cat);
      setColor(categoryInfo(cat).color);
      if (cat === "familie") {
        const r = /halbgeschwister/i.test(next) ? "halbgeschwister" : /adopt/i.test(next) ? "adoptiv" : /geschwister|zwilling/i.test(next) ? "geschwister" : /ehe|verheiratet|ehepaar/i.test(next) ? "partner" : /eltern|mutter|vater|kind/i.test(next) ? "eltern" : (g.familyRole ?? "verwandt");
        setRole(r);
      }
    }
  }

  function swap() {
    setAId(bId);
    setBId(aId);
  }

  return (
    <div className="flex flex-col gap-3">
      {!lockPair && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-[9rem] flex-1 flex-col gap-1 text-sm text-fg-soft">
            {directional ? "Elternteil" : "Figur"}
            <select name="character_a_id" value={aId} onChange={(e) => setAId(e.target.value)} required className={field}>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={swap}
            aria-label="Figuren tauschen"
            title="Tauschen"
            className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line text-muted transition hover:bg-surface-2 hover:text-fg"
          >
            <ArrowLeftRight className="h-4 w-4" strokeWidth={2} />
          </button>
          <label className="flex min-w-[9rem] flex-1 flex-col gap-1 text-sm text-fg-soft">
            {directional ? "Kind" : "Figur"}
            <select name="character_b_id" value={bId} onChange={(e) => setBId(e.target.value)} required className={field}>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {lockPair && (
        <>
          <input type="hidden" name="character_a_id" value={aId} />
          <input type="hidden" name="character_b_id" value={bId} />
        </>
      )}

      <div className="flex flex-col gap-1.5 text-sm text-fg-soft">
        <label className="flex flex-col gap-1">
          {mutual ? `${aName} sieht ${bName} als …` : "Bezeichnung"}
          <input
            type="text"
            name="type"
            value={type}
            onChange={(e) => pickType(e.target.value)}
            required
            maxLength={60}
            autoComplete="off"
            placeholder={info.suggestions[0]}
            className={field}
          />
        </label>
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Vorschläge">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => pickType(s)}
                className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-fg-soft transition hover:text-fg"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {mutual && (
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          {bName} sieht {aName} als …
          <input type="text" name="type_b" value={typeB} onChange={(e) => setTypeB(e.target.value)} maxLength={60} autoComplete="off" className={field} />
        </label>
      )}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs text-fg-soft">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          {info.label}
          {category === "familie" && role !== "verwandt" ? ` · ${FAMILY_ROLES.find((r) => r.id === role)?.label.replace("A", aName).replace("B", bName)}` : ""}
        </span>
        <button type="button" onClick={() => setMore((v) => !v)} className="text-xs text-accent hover:underline">
          {more ? "Weniger" : "Mehr"}
        </button>
        <button
          type="button"
          onClick={() => setSecret((v) => !v)}
          aria-pressed={secret}
          className={`ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition ${secret ? "bg-accent/15 text-accent" : "text-muted hover:bg-surface-2 hover:text-fg"}`}
        >
          {secret ? <EyeOff className="h-3.5 w-3.5" strokeWidth={2} /> : <Eye className="h-3.5 w-3.5" strokeWidth={2} />}
          Geheim halten
        </button>
        {secret && <input type="hidden" name="is_secret" value="on" />}
      </div>

      <input type="hidden" name="category" value={category} />
      {category === "familie" && <input type="hidden" name="family_role" value={role} />}
      <input type="hidden" name="color" value={color} />

      {more && (
        <div className="flex flex-col gap-3 rounded-lg border border-line p-3">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Art">
            {REL_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={category === c.id}
                onClick={() => {
                  setTouched(true);
                  setCategory(c.id);
                  setColor(c.color);
                }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${category === c.id ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:text-fg"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
          {category === "familie" && (
            <label className="flex flex-col gap-1 text-sm text-fg-soft">
              Verwandtschaft
              <select
                value={role}
                onChange={(e) => {
                  setTouched(true);
                  setRole(e.target.value);
                }}
                className={field}
              >
                {FAMILY_ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label.replace("A ", `${aName} `).replace(" B", ` ${bName}`).replace("A und B", `${aName} und ${bName}`)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm text-fg-soft">
              Farbe
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  setTouched(true);
                  setColor(e.target.value);
                }}
                className="h-10 w-14 cursor-pointer rounded-md border border-line bg-surface p-1"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-fg-soft">
              {editing ? "Gilt seit" : "Seit wann?"}
              <input type="date" name="since" className={field} />
            </label>
            <label className="flex items-center gap-2 pb-2 text-sm text-fg-soft">
              <input
                type="checkbox"
                checked={mutual}
                onChange={(e) => {
                  setMutual(e.target.checked);
                  if (!e.target.checked) setTypeB("");
                }}
              />
              Unterschiedliche Sicht
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm text-fg-soft">
            Notiz zur Beziehung
            <input type="text" name="label" defaultValue={initial?.label ?? ""} maxLength={200} className={field} />
          </label>
          {editing && (
            <label className="flex flex-col gap-1 text-sm text-fg-soft">
              Was ist passiert? (für den Verlauf)
              <input type="text" name="note" maxLength={300} className={field} />
            </label>
          )}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-fg-soft">
              <input type="checkbox" checked={ended} onChange={(e) => setEnded(e.target.checked)} />
              Beendet
            </label>
            {ended && (
              <div className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="ended" value="on" />
                <label className="flex flex-col gap-1 text-sm text-fg-soft">
                  Beendet am
                  <input type="date" name="ended_on" defaultValue={initial?.ended_on ?? ""} className={field} />
                </label>
                <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm text-fg-soft">
                  Neue Bezeichnung
                  <input type="text" name="ended_label" defaultValue={initial?.ended_label ?? ""} maxLength={40} placeholder="z. B. war befreundet" className={field} />
                </label>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
