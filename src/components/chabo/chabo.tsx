"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, CircleHelp, Clover, Dices, Lock, LockOpen, Pencil, Plus, Undo2, X } from "lucide-react";
import { AvatarUpload } from "@/components/avatar-upload";
import { RichTextEditor } from "@/components/rich-text-editor";
import { EmojiHtml } from "@/components/custom-emoji-provider";
import { MentionInput, MentionText } from "./mention-input";
import { RollBar } from "./roll-bar";
import { rollAttributes, rollTalents, type AttrStyle, type TalentStyle } from "@/lib/sheet-random";
import { fieldKind, rollAllFields, rollRow, worldNames, type CustomPools } from "@/lib/random-pools";
import { stripMentionAt } from "@/lib/sheet-mentions";
import type { Character } from "@/lib/types";
import { folderColorHex } from "@/lib/wiki-folder-style";
import { createClient } from "@/lib/supabase/client";
import { fetchPublicSheet, parseSheetUrl } from "@/lib/charakterbogen";
import { saveCharacterSheet } from "@/app/characters/sheet-actions";
import {
  BASIS_BUDGET,
  BASIS_MAX,
  BASIS_MIN,
  BONUS_MAX,
  BONUS_MIN,
  FAMILY_SUGGESTIONS,
  MAX_FAMILY_FIELDS,
  MAX_NOTE_BLOCKS,
  MAX_PERSONAL_FIELDS,
  RACES,
  TALENT_BONUS_BUDGET,
  TALENT_BONUS_MAX,
  TALENT_BONUS_MIN,
  applyRace,
  attrRows,
  budgets,
  emptySheet,
  hasErrors,
  luckTotal,
  normalizeSheet,
  talentRows,
  validateSheet,
  withDerived,
  type Race,
  type SheetData,
} from "@/lib/sheet-rules";

// Jedes Attribut hat einen festen Farbton (dieselben Töne wie bei Ordnern und Seitenarten im Wiki).
const ATTR_COLOR: Record<string, string> = {
  MU: "rose",
  IG: "sky",
  GE: "gold",
  KO: "sage",
  IN: "peach",
  KK: "slate",
  FF: "teal",
  CH: "plum",
  SB: "gray",
  GL: "gold",
};

const card = "flex flex-col gap-6 rounded-2xl border border-line bg-surface p-5 @xl:p-8";
const numInput =
  "w-full min-w-0 rounded-lg border border-line bg-app px-2 py-2 text-center text-base text-fg outline-none focus:border-accent aria-[invalid=true]:border-red-500";
// Spalten der Talent-Tabelle: Name, Basis, Bonus, Gesamt. Am Handy schmal (in der Ansicht noch schmaler als beim Bearbeiten), ab mittlerer Breite großzügig.
const talentGridView = "grid grid-cols-[minmax(0,1fr)_2.25rem_2.75rem_3rem] items-center gap-x-2.5 @xl:grid-cols-[minmax(0,1fr)_4rem_6rem_4.5rem] @xl:gap-x-5";
const talentGridEdit = "grid grid-cols-[minmax(0,1fr)_2.25rem_3.75rem_3rem] items-center gap-x-2.5 @xl:grid-cols-[minmax(0,1fr)_4rem_6rem_4.5rem] @xl:gap-x-5";
const textInput = "w-full rounded-lg border border-line bg-app px-3 py-2.5 text-sm text-fg outline-none focus:border-accent";

// Rückgängig-Schritte je Bereich: gemerkt wird nur, was das Würfeln geändert hat, damit andere Eingaben nicht verloren gehen.
type RollSection = "attrs" | "talents" | "fields";
type Snapshots = Record<RollSection, Partial<SheetData>[]>;
const NO_SNAPSHOTS: Snapshots = { attrs: [], talents: [], fields: [] };
const MAX_UNDO = 15;

type Status = { kind: "idle" } | { kind: "pending" } | { kind: "saved" } | { kind: "invalid" } | { kind: "error"; message: string };

// Eindeutige Schlüssel für Notiz-Blöcke: fortlaufend statt zufällig, damit Server und Browser beim ersten Anzeigen dasselbe erzeugen.
let blockCounter = 0;
const uid = () => `b${blockCounter++}`;

// Schloss-Knopf: geheime Zeilen und Notizen sieht nur die Besitzer:in
function LockToggle({ secret, onToggle }: { secret: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={secret}
      aria-label="Geheim halten"
      title="Geheim halten"
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition ${secret ? "bg-accent/15 text-accent" : "text-muted hover:bg-surface-2 hover:text-fg"}`}
    >
      {secret ? <Lock className="h-4 w-4" strokeWidth={2} /> : <LockOpen className="h-4 w-4" strokeWidth={2} />}
    </button>
  );
}

// Kleines Schloss vor geheimen Einträgen in der Ansicht (sichtbar nur für die Besitzer:in)
function SecretMark() {
  return <Lock aria-label="Geheim" className="mr-1.5 inline h-3 w-3 -translate-y-px text-accent" strokeWidth={2.25} />;
}

function Meter({ used, max, label }: { used: number; max: number; label: string }) {
  const over = used > max;
  return (
    <div className="flex flex-col gap-1" role="group" aria-label={label}>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-fg-soft">{label}</span>
        <span className={over ? "font-medium text-red-600 dark:text-red-400" : used === max ? "font-medium text-accent" : "text-fg-soft"}>
          {used} / {max}
          {over ? ` (${used - max} zu viel)` : ""}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div className={`h-full rounded-full ${over ? "bg-red-500" : "bg-accent"}`} style={{ width: `${Math.min(100, Math.max(0, (used / max) * 100))}%` }} />
      </div>
    </div>
  );
}

export function Chabo({
  characterId,
  characterName,
  initial,
  editable,
  legacyUrl,
  mentionCharacters = [],
  randomLists,
  variant = "page",
}: {
  characterId: string;
  characterName: string;
  initial: SheetData | null;
  editable: boolean;
  // Adresse des alten Charakterbogens (öffentlicher Link) zum Übernehmen
  legacyUrl?: string | null;
  // Charaktere der Welt für @-Erwähnungen in Feldern und Notizen
  mentionCharacters?: Character[];
  // Eigene Zufallseinträge der Welt (werden unter die mitgelieferten gemischt)
  randomLists?: Partial<CustomPools>;
  // panel: kompakte Ansicht, z. B. im seitlichen Fenster einer Szene
  variant?: "page" | "panel";
}) {
  const canEdit = editable && variant === "page";
  // Geheimes zeigt die Ansicht nur der Besitzer:in (fremde Bögen enthalten es gar nicht erst, das hier ist zusätzliche Absicherung)
  const seen = <T extends { secret?: boolean }>(list: T[]) => (editable ? list : list.filter((x) => !x.secret));
  const Title = variant === "page" ? "h1" : "h2";
  const [data, setData] = useState<SheetData>(() => withDerived(initial ?? emptySheet()));
  const [editing, setEditing] = useState(canEdit && !initial);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [blockIds, setBlockIds] = useState(() => (initial ?? emptySheet()).notesBlocks.map((_, i) => `s${i}`));
  const [portraitKey, setPortraitKey] = useState(0);
  const [attrStyle, setAttrStyle] = useState<AttrStyle>("ausgewogen");
  const [talentStyle, setTalentStyle] = useState<TalentStyle>("allrounder");
  const [snapshots, setSnapshots] = useState<Snapshots>(NO_SNAPSHOTS);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<SheetData | null>(null);

  // Beim Verlassen der Seite noch nicht gespeicherte Änderungen sofort abschicken
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (pending.current) void saveCharacterSheet(characterId, pending.current);
    },
    [characterId],
  );

  function commit(next: SheetData) {
    const d = withDerived(next);
    setData(d);
    if (!canEdit) return;
    if (timer.current) clearTimeout(timer.current);
    if (hasErrors(validateSheet(d))) {
      pending.current = null;
      setStatus({ kind: "invalid" });
      return;
    }
    pending.current = d;
    setStatus({ kind: "pending" });
    timer.current = setTimeout(async () => {
      pending.current = null;
      const err = await saveCharacterSheet(characterId, d);
      setStatus(err ? { kind: "error", message: err } : { kind: "saved" });
    }, 900);
  }

  const attrs = attrRows(data);
  const talents = talentRows(data);
  const bud = budgets(data);
  const errors = validateSheet(data);
  const clovers = luckTotal(data);
  const raceLabel = RACES.find((r) => r.id === data.race)?.label;

  async function importLegacy() {
    if (!legacyUrl) return;
    const ref = parseSheetUrl(legacyUrl);
    if (!ref) {
      setImportError("Die Adresse des alten Charakterbogens ist ungültig.");
      return;
    }
    if (!window.confirm("Die aktuellen Werte im ChaBo werden durch den alten Charakterbogen ersetzt. Fortfahren?")) return;
    setImporting(true);
    setImportError(null);
    try {
      const sheet = await fetchPublicSheet(ref);
      if (!sheet) {
        setImportError("Der alte Charakterbogen ist nicht öffentlich oder wurde nicht gefunden.");
        return;
      }
      const next = normalizeSheet(sheet.data);
      // Altes Bild (als Daten-Adresse im Bogen) in den Speicher übernehmen
      const dataUrl = sheet.data.portrait?.dataUrl;
      if (dataUrl?.startsWith("data:image/")) {
        try {
          const blob = await (await fetch(dataUrl)).blob();
          const ext = blob.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
          const supabase = createClient();
          const path = `${crypto.randomUUID()}.${ext}`;
          const { error } = await supabase.storage.from("avatars").upload(path, blob);
          if (!error) next.portraitUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
        } catch {
          // Das Bild ist optional; der Rest wird trotzdem übernommen.
        }
      }
      setBlockIds(next.notesBlocks.map(uid));
      setPortraitKey((k) => k + 1);
      setSnapshots(NO_SNAPSHOTS);
      commit(next);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Übernehmen fehlgeschlagen.");
    } finally {
      setImporting(false);
    }
  }

  function rollSection(section: RollSection) {
    const next = section === "attrs" ? rollAttributes(data, attrStyle, Math.random) : rollTalents(data, talentStyle, Math.random);
    const before: Partial<SheetData> = section === "attrs" ? { attrBasis: data.attrBasis } : { talentBonus: data.talentBonus };
    setSnapshots((s) => ({ ...s, [section]: [...s[section], before].slice(-MAX_UNDO) }));
    commit(next);
  }

  // Persönliche Angaben würfeln: gemerkt werden Zeilen, Besondere Natur und deren Boni (das Wesen setzt sie mit).
  function rememberFields() {
    const before: Partial<SheetData> = { personalFields: data.personalFields, race: data.race, attrBonus: data.attrBonus };
    setSnapshots((s) => ({ ...s, fields: [...s.fields, before].slice(-MAX_UNDO) }));
  }
  const takenNames = worldNames(mentionCharacters);

  function rollAllPersonal() {
    const next = rollAllFields(data, randomLists, Math.random, takenNames);
    // Hat sich nichts geändert (alles ist schon ausgefüllt), gibt es auch nichts rückgängig zu machen.
    if (next.race === data.race && JSON.stringify(next.personalFields) === JSON.stringify(data.personalFields)) return;
    rememberFields();
    commit(next);
  }

  function rollOnePersonal(index: number) {
    rememberFields();
    commit(rollRow(data, index, randomLists, Math.random, takenNames));
  }

  function undoSection(section: RollSection) {
    const last = snapshots[section][snapshots[section].length - 1];
    if (!last) return;
    setSnapshots((s) => ({ ...s, [section]: s[section].slice(0, -1) }));
    commit({ ...data, ...last });
  }

  const setAttr = (code: string, key: "attrBasis" | "attrBonus", value: string) => commit({ ...data, [key]: { ...data[key], [code]: value } });
  const setTalentBonus = (slug: string, value: string) => commit({ ...data, talentBonus: { ...data.talentBonus, [slug]: value } });

  const statusText =
    status.kind === "pending" ? "Speichert …" : status.kind === "saved" ? "Gespeichert" : status.kind === "invalid" ? "Nicht gespeichert, ungültige Werte" : status.kind === "error" ? status.message : "";

  return (
    <div className="@container flex flex-col gap-5">
      <header className={`${card} @xl:flex-row @xl:items-start`}>
        {editing ? (
          <div key={portraitKey} className="shrink-0">
            <AvatarUpload name="portrait_url" initialUrl={data.portraitUrl} displayName={characterName} variant="portrait" onChange={(url) => commit({ ...data, portraitUrl: url || null })} />
          </div>
        ) : data.portraitUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.portraitUrl} alt="" className="h-40 w-32 shrink-0 rounded-2xl object-cover" />
        ) : (
          <span aria-hidden className="flex h-40 w-32 shrink-0 items-center justify-center rounded-2xl bg-surface-2 font-serif text-5xl text-accent">
            {characterName.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Title className="font-serif text-3xl leading-tight text-fg @xl:text-4xl">{characterName}</Title>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                <span>Charakterbogen</span>
                {data.race !== "none" && raceLabel && <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-fg-soft">{raceLabel}</span>}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/hilfe" title="Hilfe" aria-label="Hilfe" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg">
                <CircleHelp className="h-5 w-5" strokeWidth={1.75} />
              </Link>
              {canEdit &&
                (editing ? (
                  <button type="button" onClick={() => { setEditing(false); setSnapshots(NO_SNAPSHOTS); }} className="flex items-center gap-1.5 rounded-lg bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90">
                    <Check className="h-4 w-4" strokeWidth={2.25} />
                    Fertig
                  </button>
                ) : (
                  <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-4 py-2 text-sm font-medium text-fg transition hover:bg-surface-3">
                    <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                    Bearbeiten
                  </button>
                ))}
              {variant === "panel" && editable && (
                <Link href={`/characters/${characterId}/chabo`} className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-4 py-2 text-sm font-medium text-fg transition hover:bg-surface-3">
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                  Bearbeiten
                </Link>
              )}
            </div>
          </div>

          {editing && (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2 text-fg-soft">
                Besondere Natur
                <select value={data.race} onChange={(e) => commit(applyRace(data, e.target.value as Race))} className="rounded-lg border border-line bg-app px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent">
                  {RACES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
              {legacyUrl && (
                <button type="button" onClick={importLegacy} disabled={importing} className="rounded-lg bg-surface-2 px-3 py-1.5 text-sm text-fg-soft transition hover:text-fg disabled:opacity-50">
                  {importing ? "Übernimmt …" : "Aus altem Charakterbogen übernehmen"}
                </button>
              )}
              <span aria-live="polite" className={`text-xs ${status.kind === "invalid" || status.kind === "error" ? "text-red-600 dark:text-red-400" : "text-muted"}`}>
                {statusText}
              </span>
            </div>
          )}
          {importError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{importError}</p>}

          {(editing || seen(data.personalFields).some((f) => f.value.trim())) && (
            <div>
              {editing ? (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2 pb-1">
                    <button type="button" onClick={rollAllPersonal} aria-label="Alles zufällig würfeln" className="flex items-center gap-1.5 rounded-lg bg-accent-strong px-3 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90">
                      <Dices className="h-4 w-4" strokeWidth={2} />
                      Alles zufällig
                    </button>
                    <button type="button" onClick={() => undoSection("fields")} disabled={snapshots.fields.length === 0} aria-label="Angaben rückgängig" className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5 text-sm text-fg-soft transition hover:text-fg disabled:opacity-40">
                      <Undo2 className="h-4 w-4" strokeWidth={2} />
                      Rückgängig
                    </button>
                  </div>
                  {data.personalFields.map((f, i) => (
                    <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-2 gap-y-1.5 @xl:grid-cols-[9rem_minmax(0,1fr)_auto_auto]">
                      <input value={f.label} maxLength={40} placeholder="Bezeichnung" aria-label="Bezeichnung" onChange={(e) => commit({ ...data, personalFields: data.personalFields.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} className={`${textInput} col-span-3 @xl:col-span-1`} />
                      <div className="relative min-w-0">
                        <MentionInput value={f.value} targets={mentionCharacters} placeholder="Angabe, mit @ Charaktere verlinken" ariaLabel={f.label || "Angabe"} onChange={(value) => commit({ ...data, personalFields: data.personalFields.map((x, j) => (j === i ? { ...x, value } : x)) })} className={fieldKind(f.label) ? `${textInput} pr-10` : textInput} />
                        {fieldKind(f.label) && (
                          <button type="button" onClick={() => rollOnePersonal(i)} aria-label={`${f.label} würfeln`} className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted transition hover:bg-surface-2 hover:text-accent">
                            <Dices className="h-4 w-4" strokeWidth={2} />
                          </button>
                        )}
                      </div>
                      <LockToggle secret={Boolean(f.secret)} onToggle={() => commit({ ...data, personalFields: data.personalFields.map((x, j) => (j === i ? { ...x, secret: x.secret ? undefined : true } : x)) })} />
                      <button type="button" aria-label="Zeile entfernen" onClick={() => commit({ ...data, personalFields: data.personalFields.filter((_, j) => j !== i) })} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg">
                        <X className="h-4 w-4" strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                  {data.personalFields.length < MAX_PERSONAL_FIELDS && (
                    <button type="button" onClick={() => commit({ ...data, personalFields: [...data.personalFields, { label: "", value: "" }] })} className="flex w-fit items-center gap-1.5 text-sm text-accent hover:underline">
                      <Plus className="h-4 w-4" strokeWidth={2} />
                      Zeile hinzufügen
                    </button>
                  )}
                </div>
              ) : (
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                  {seen(data.personalFields)
                    .filter((f) => f.value.trim())
                    .map((f, i) => (
                      <div key={i} className="contents">
                        <dt className="text-muted">
                          {f.secret && <SecretMark />}
                          {f.label || "–"}
                        </dt>
                        <dd className="text-fg">
                          <MentionText text={f.value} targets={mentionCharacters} />
                        </dd>
                      </div>
                    ))}
                </dl>
              )}
            </div>
          )}
        </div>
      </header>

      {(editing || seen(data.family).some((f) => f.label.trim() || f.value.trim())) && (
        <section aria-label="Familie" className={card}>
          <h2 className="font-serif text-xl text-fg">Familie</h2>
          {editing ? (
            <div className="flex flex-col gap-3">
              <datalist id="chabo-familie-vorschlaege">
                {FAMILY_SUGGESTIONS.map((x) => (
                  <option key={x} value={x} />
                ))}
              </datalist>
              {data.family.map((f, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-x-2 gap-y-1.5 @xl:grid-cols-[11rem_minmax(0,1fr)_auto_auto]">
                  <input value={f.label} maxLength={40} list="chabo-familie-vorschlaege" placeholder="z. B. Mutter" aria-label="Bezeichnung" onChange={(e) => commit({ ...data, family: data.family.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} className={`${textInput} col-span-3 @xl:col-span-1`} />
                  <MentionInput value={f.value} targets={mentionCharacters} placeholder="Name, mit @ Charakter verlinken" ariaLabel={f.label || "Angabe"} onChange={(value) => commit({ ...data, family: data.family.map((x, j) => (j === i ? { ...x, value } : x)) })} className={textInput} />
                  <LockToggle secret={Boolean(f.secret)} onToggle={() => commit({ ...data, family: data.family.map((x, j) => (j === i ? { ...x, secret: x.secret ? undefined : true } : x)) })} />
                  <button type="button" aria-label="Zeile entfernen" onClick={() => commit({ ...data, family: data.family.filter((_, j) => j !== i) })} className="flex h-10 w-10 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg">
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
              ))}
              {data.family.length < MAX_FAMILY_FIELDS && (
                <button type="button" onClick={() => commit({ ...data, family: [...data.family, { label: "", value: "" }] })} className="flex w-fit items-center gap-1.5 text-sm text-accent hover:underline">
                  <Plus className="h-4 w-4" strokeWidth={2} />
                  Zeile hinzufügen
                </button>
              )}
            </div>
          ) : (
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-[15px]">
              {seen(data.family)
                .filter((f) => f.label.trim() || f.value.trim())
                .map((f, i) => (
                  <div key={i} className="contents">
                    <dt className="text-muted">
                      {f.secret && <SecretMark />}
                      {f.label || "–"}
                    </dt>
                    <dd className="text-fg">
                      <MentionText text={f.value} targets={mentionCharacters} />
                    </dd>
                  </div>
                ))}
            </dl>
          )}
        </section>
      )}

      <section aria-label="Attribute" className={card}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-serif text-xl text-fg">Attribute</h2>
          {editing && (
            <div className="w-full @xl:w-72">
              <Meter used={bud.basisUsed} max={BASIS_BUDGET} label="Attributpunkte" />
            </div>
          )}
        </div>
        {editing && (
          <RollBar
            label="Attribute"
            options={[
              { id: "ausgewogen", label: "Ausgewogen" },
              { id: "wild", label: "Wild" },
            ]}
            value={attrStyle}
            onStyle={setAttrStyle}
            onRoll={() => rollSection("attrs")}
            onUndo={() => undoSection("attrs")}
            canUndo={snapshots.attrs.length > 0}
          />
        )}
        <ul className="grid grid-cols-2 gap-3 @4xl:grid-cols-5 @4xl:gap-4">
          {attrs.map((a) => {
            const hex = folderColorHex(ATTR_COLOR[a.code]);
            const isLuck = a.code === "GL";
            return (
              <li key={a.code} className="flex flex-col gap-3 rounded-2xl p-4 @xl:p-5" style={hex ? { backgroundColor: `color-mix(in srgb, ${hex} 16%, transparent)` } : undefined}>
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-[15px] font-medium leading-snug text-fg [overflow-wrap:anywhere] @4xl:text-sm">{a.name}</p>
                  <span className="shrink-0 rounded-md bg-app/60 px-1.5 py-0.5 text-xs font-semibold text-muted">{a.code}</span>
                </div>
                {editing ? (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2.5">
                      <label className="flex flex-col gap-1 text-xs text-muted">
                        Basis
                        <input type="number" inputMode="numeric" min={BASIS_MIN} max={BASIS_MAX} value={data.attrBasis[a.code] ?? ""} aria-invalid={Boolean(errors.attrBasis[a.code])} title={errors.attrBasis[a.code]} onChange={(e) => setAttr(a.code, "attrBasis", e.target.value)} className={numInput} />
                      </label>
                      {isLuck ? (
                        <span className="flex flex-col gap-1 text-xs text-muted">
                          Punkte
                          <span className="flex min-h-[42px] flex-wrap items-center justify-center gap-0.5">
                            {Array.from({ length: clovers }, (_, i) => (
                              <Clover key={i} className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                            ))}
                            {clovers === 0 && <span className="text-sm text-muted">–</span>}
                          </span>
                        </span>
                      ) : (
                        <label className="flex flex-col gap-1 text-xs text-muted">
                          Bonus
                          <input type="number" inputMode="numeric" min={BONUS_MIN} max={BONUS_MAX} value={data.attrBonus[a.code] ?? ""} aria-invalid={Boolean(errors.attrBonus[a.code])} title={errors.attrBonus[a.code]} onChange={(e) => setAttr(a.code, "attrBonus", e.target.value)} className={numInput} />
                        </label>
                      )}
                    </div>
                    {!isLuck && (
                      <p className="flex items-baseline justify-between text-xs text-muted">
                        Gesamt <span className="font-serif text-2xl text-fg">{a.total ?? "–"}</span>
                      </p>
                    )}
                  </div>
                ) : isLuck ? (
                  <div className="flex flex-row items-end justify-between gap-3 @4xl:flex-col @4xl:items-start @4xl:justify-start @4xl:gap-2">
                    <span className="font-serif text-5xl leading-none text-fg">{a.basis ?? "–"}</span>
                    <span className="flex flex-wrap items-center justify-end gap-1 @4xl:justify-start" title={`${clovers} Glückspunkt${clovers === 1 ? "" : "e"} pro Szene`}>
                      {Array.from({ length: clovers }, (_, i) => (
                        <Clover key={i} className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                      ))}
                      <span className="text-xs text-muted">{clovers} pro Szene</span>
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-row items-end justify-between gap-3 @4xl:flex-col @4xl:items-start @4xl:justify-start @4xl:gap-2">
                    <span className="font-serif text-5xl leading-none text-fg">{a.total ?? "–"}</span>
                    <span className="text-right text-xs text-muted @4xl:text-left">
                      {a.basis != null || a.bonus != null ? (
                        <>
                          Basis {a.basis ?? 0}
                          {a.bonus ? <> · Bonus {a.bonus > 0 ? "+" : "−"}{Math.abs(a.bonus)}</> : null}
                        </>
                      ) : (
                        "nicht ausgefüllt"
                      )}
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {editing && errors.budget.length > 0 && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {errors.budget.join(". ")}
          </p>
        )}
      </section>

      <section aria-label="Talente" className={card}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-serif text-xl text-fg">Talente</h2>
          {editing && (
            <div className="w-full @xl:w-72">
              <Meter used={bud.talentUsed} max={TALENT_BONUS_BUDGET} label="Talentpunkte" />
            </div>
          )}
        </div>
        {editing && (
          <RollBar
            label="Talente"
            options={[
              { id: "spezialist", label: "Spezialist:in" },
              { id: "allrounder", label: "Allrounder:in" },
            ]}
            value={talentStyle}
            onStyle={setTalentStyle}
            onRoll={() => rollSection("talents")}
            onUndo={() => undoSection("talents")}
            canUndo={snapshots.talents.length > 0}
          />
        )}
        <div className="flex flex-col">
          <div className={`${editing ? talentGridEdit : talentGridView} border-b border-line pb-2 text-xs font-medium text-muted`}>
            <span>Talent</span>
            <span className="text-center">Basis</span>
            <span className="text-center">Bonus</span>
            <span className="text-right">Gesamt</span>
          </div>
          <ul>
            {talents.map((t) => {
              const names = t.attrs.map((c) => attrs.find((a) => a.code === c));
              const calc = t.basis == null ? "Noch nicht berechenbar" : `(${names[0]?.total} + ${names[1]?.total}) ÷ 2 = ${t.basis}`;
              return (
                <li key={t.slug} className={`${editing ? talentGridEdit : talentGridView} border-b border-line py-3.5 last:border-0`}>
                  <div className="min-w-0">
                    <p className="text-[15px] leading-snug text-fg [overflow-wrap:anywhere] hyphens-auto">{t.name}</p>
                    <p className="text-xs text-muted">
                      {names[0]?.name} + {names[1]?.name}
                    </p>
                  </div>
                  <span className="text-center text-base text-fg-soft" title={calc}>
                    {t.basis ?? "–"}
                  </span>
                  {editing ? (
                    <input type="number" inputMode="numeric" min={TALENT_BONUS_MIN} max={TALENT_BONUS_MAX} value={data.talentBonus[t.slug] ?? ""} placeholder="0" aria-label={`Bonus ${t.name}`} aria-invalid={Boolean(errors.talentBonus[t.slug])} title={errors.talentBonus[t.slug]} onChange={(e) => setTalentBonus(t.slug, e.target.value)} className={numInput} />
                  ) : (
                    <span className={`text-center text-base ${t.bonus ? "font-medium text-accent" : "text-muted"}`}>{t.bonus ? `${t.bonus > 0 ? "+" : "−"}${Math.abs(t.bonus)}` : "–"}</span>
                  )}
                  <span className="flex justify-end">
                    <span
                      className={`inline-flex h-11 min-w-11 items-center justify-center rounded-xl px-2 font-serif text-2xl ${t.total == null ? "text-muted" : "bg-surface-2 text-fg"}`}
                      title={t.capped ? `Auf ${TALENT_BONUS_MAX} gedeckelt` : undefined}
                    >
                      {t.total ?? "–"}
                      {t.capped && <span className="text-sm text-muted">*</span>}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section aria-label="Notizen" className={card}>
        <h2 className="font-serif text-xl text-fg">Notizen</h2>
        {editing ? (
          <div className="flex flex-col gap-4">
            {data.notesBlocks.map((b, i) => (
              <div key={blockIds[i] ?? i} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input value={b.label} maxLength={60} placeholder="Überschrift" aria-label="Überschrift des Blocks" onChange={(e) => commit({ ...data, notesBlocks: data.notesBlocks.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} className={textInput} />
                  <LockToggle secret={Boolean(b.secret)} onToggle={() => commit({ ...data, notesBlocks: data.notesBlocks.map((x, j) => (j === i ? { ...x, secret: x.secret ? undefined : true } : x)) })} />
                  <button
                    type="button"
                    aria-label="Block entfernen"
                    onClick={() => {
                      setBlockIds((ids) => ids.filter((_, j) => j !== i));
                      commit({ ...data, notesBlocks: data.notesBlocks.filter((_, j) => j !== i) });
                    }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
                <RichTextEditor name={`notes_${blockIds[i] ?? i}`} initialContent={b.html} minHeight={140} mentionCharacters={mentionCharacters} onChange={(html) => commit({ ...data, notesBlocks: data.notesBlocks.map((x, j) => (j === i ? { ...x, html } : x)) })} />
              </div>
            ))}
            {data.notesBlocks.length < MAX_NOTE_BLOCKS && (
              <button
                type="button"
                onClick={() => {
                  setBlockIds((ids) => [...ids, uid()]);
                  commit({ ...data, notesBlocks: [...data.notesBlocks, { label: "", html: "" }] });
                }}
                className="flex w-fit items-center gap-1.5 text-sm text-accent hover:underline"
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
                Block hinzufügen
              </button>
            )}
          </div>
        ) : seen(data.notesBlocks).some((b) => b.html.replace(/<[^>]*>/g, "").trim() || /<img/i.test(b.html)) ? (
          <div className="flex flex-col gap-2">
            {seen(data.notesBlocks)
              .filter((b) => b.html.replace(/<[^>]*>/g, "").trim() || /<img/i.test(b.html))
              .map((b, i) => (
                <details key={i} open={i === 0} className="group rounded-xl border border-line px-4 py-3">
                  <summary className="cursor-pointer list-none text-sm font-medium text-fg [&::-webkit-details-marker]:hidden">
                    {b.secret && <SecretMark />}
                    {b.label || "Notizen"}
                  </summary>
                  <EmojiHtml className="post-content mt-2 text-sm text-fg-soft" html={stripMentionAt(b.html)} />
                </details>
              ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Noch keine Notizen.</p>
        )}
      </section>
    </div>
  );
}
