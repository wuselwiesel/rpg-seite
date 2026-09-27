"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Skull, X } from "lucide-react";
import { previewFateAction, postFateResultAction, type FatePreview } from "./actions";
import type { Character } from "@/lib/types";
import { ALL_TAGS } from "@/lib/fate-data";
import { FATE_CATEGORIES, SEVERITY_ORDER } from "@/lib/fate-types";
import type { Char1Config, FateCategory, FateSeverity, GenderFilter, OwnerFilter, SlotConfig } from "@/lib/fate-types";

export type WorldOption = {
  id: string;
  name: string;
  owners: { ownerId: string; label: string }[];
};

const GENDER_LABELS: Record<GenderFilter, string> = {
  alle: "Alle",
  weiblich: "Nur Frauen",
  maennlich: "Nur Männer",
  divers: "Nur Divers",
};

const SEVERITY_STYLES: Record<string, string> = {
  leicht: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  mittel: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  schwer: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  "sehr schwer": "bg-red-500/15 text-red-600 dark:text-red-400",
  extrem: "bg-red-700/20 text-red-700 dark:text-red-300",
};

function GenderSelect({ value, onChange }: { value: GenderFilter; onChange: (v: GenderFilter) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-fg-soft">
      Geschlecht
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as GenderFilter)}
        className="rounded-md border border-line bg-app px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent"
      >
        {(Object.keys(GENDER_LABELS) as GenderFilter[]).map((g) => (
          <option key={g} value={g}>
            {GENDER_LABELS[g]}
          </option>
        ))}
      </select>
    </label>
  );
}

function WorldSelect({
  worldOptions,
  value,
  onChange,
}: {
  worldOptions: WorldOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-fg-soft">
      Welt
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-line bg-app px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent"
      >
        {worldOptions.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProfilSelect({
  owners,
  value,
  onChange,
}: {
  owners: { ownerId: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-fg-soft">
      Profil
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-line bg-app px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent"
      >
        <option value="alle">Alle</option>
        {owners.map((o) => (
          <option key={o.ownerId} value={o.ownerId}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const SEVERITY_LABELS: Record<FateSeverity, string> = {
  leicht: "Leicht",
  mittel: "Mittel",
  schwer: "Schwer",
  "sehr schwer": "Sehr schwer",
  extrem: "Extrem",
};

function SeveritySelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: FateSeverity;
  onChange: (v: FateSeverity) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-fg-soft">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as FateSeverity)}
        className="rounded-md border border-line bg-app px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent"
      >
        {SEVERITY_ORDER.map((s) => (
          <option key={s} value={s}>
            {SEVERITY_LABELS[s]}
          </option>
        ))}
      </select>
    </label>
  );
}

export type CharacterOption = { id: string; name: string; ownerId: string; ownerLabel: string };
export type WorldCharacterOptions = { worldId: string; worldName: string; characters: CharacterOption[] };

export function SchicksalForm({
  ownCharacters,
  worldOptions,
  allCharacterOptions,
  activeWorldId,
}: {
  ownCharacters: Character[];
  worldOptions: WorldOption[];
  allCharacterOptions: WorldCharacterOptions[];
  activeWorldId: string;
}) {
  const router = useRouter();
  const [char1Mode, setChar1Mode] = useState<"pool" | "specific">("pool");
  const [char1Id, setChar1Id] = useState(ownCharacters[0]?.id ?? "");
  const [char1Gender, setChar1Gender] = useState<GenderFilter>("alle");
  const [char1Owner, setChar1Owner] = useState<OwnerFilter>("alle");

  // Filter für "Bestimmter Charakter": engt die (nach Welt gruppierte) Auswahlliste ein.
  const [char1FilterWorld, setChar1FilterWorld] = useState<string>("alle");
  const [char1FilterOwner, setChar1FilterOwner] = useState<string>("alle");

  const activeWorldOwners = worldOptions.find((w) => w.id === activeWorldId)?.owners ?? [];

  // Alle Besitzer:innen, deren Charaktere irgendwo wählbar sind (für den Profil-Filter bei
  // "Bestimmter Charakter" - anders als activeWorldOwners nicht auf die aktive Welt beschränkt).
  const allOwners = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of allCharacterOptions) for (const c of w.characters) map.set(c.ownerId, c.ownerLabel);
    return Array.from(map, ([ownerId, label]) => ({ ownerId, label }));
  }, [allCharacterOptions]);

  const filteredCharacterOptions = useMemo(
    () =>
      allCharacterOptions
        .filter((w) => char1FilterWorld === "alle" || w.worldId === char1FilterWorld)
        .map((w) => ({
          ...w,
          characters: w.characters.filter((c) => char1FilterOwner === "alle" || c.ownerId === char1FilterOwner),
        }))
        .filter((w) => w.characters.length > 0),
    [allCharacterOptions, char1FilterWorld, char1FilterOwner],
  );

  // Passt die aktuelle Auswahl nicht mehr zum Filter, automatisch auf den ersten
  // verfügbaren Charakter wechseln, statt eine unsichtbare Auswahl stehen zu lassen.
  useEffect(() => {
    if (char1Mode !== "specific") return;
    const stillVisible = filteredCharacterOptions.some((w) => w.characters.some((c) => c.id === char1Id));
    if (!stillVisible) setChar1Id(filteredCharacterOptions[0]?.characters[0]?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredCharacterOptions, char1Mode]);

  const [extraEnabled, setExtraEnabled] = useState(false);
  const [slots, setSlots] = useState<SlotConfig[]>([]);

  const [minSeverity, setMinSeverity] = useState<FateSeverity>("leicht");
  const [maxSeverity, setMaxSeverity] = useState<FateSeverity>("extrem");

  const [selectedCategories, setSelectedCategories] = useState<FateCategory[]>([]);

  function toggleCategory(category: FateCategory) {
    setSelectedCategories((prev) => (prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]));
  }

  const [preview, setPreview] = useState<FatePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);
  const [posting, setPosting] = useState(false);

  const [themeTags, setThemeTags] = useState<string[] | null>(null);

  function rollTheme() {
    const pool = [...ALL_TAGS];
    const picked: string[] = [];
    const count = Math.min(2, pool.length);
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      picked.push(pool[idx]);
      pool.splice(idx, 1);
    }
    setThemeTags(picked);
  }

  function addSlot() {
    setSlots((prev) => (prev.length >= 2 ? prev : [...prev, { worldId: activeWorldId, gender: "alle", ownerId: "alle" }]));
  }

  function removeSlot(index: number) {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSlot(index: number, patch: Partial<SlotConfig>) {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function changeMinSeverity(value: FateSeverity) {
    setMinSeverity(value);
    if (SEVERITY_ORDER.indexOf(value) > SEVERITY_ORDER.indexOf(maxSeverity)) setMaxSeverity(value);
  }

  function changeMaxSeverity(value: FateSeverity) {
    setMaxSeverity(value);
    if (SEVERITY_ORDER.indexOf(value) < SEVERITY_ORDER.indexOf(minSeverity)) setMinSeverity(value);
  }

  async function roll() {
    setRolling(true);
    setError(null);
    try {
      const char1Config: Char1Config =
        char1Mode === "specific"
          ? { mode: "specific", characterId: char1Id }
          : { mode: "pool", gender: char1Gender, ownerId: char1Owner };
      const result = await previewFateAction(
        char1Config,
        extraEnabled ? slots : [],
        { min: minSeverity, max: maxSeverity },
        selectedCategories,
      );
      if ("error" in result) {
        setError(result.error);
        setPreview(null);
      } else {
        setPreview(result);
      }
    } catch {
      setError("Würfeln hat gerade nicht geklappt. Bitte Seite neu laden und nochmal versuchen.");
      setPreview(null);
    } finally {
      setRolling(false);
    }
  }

  async function post() {
    if (!preview) return;
    setPosting(true);
    setError(null);
    try {
      const result = await postFateResultAction(
        preview.fateId,
        preview.char1.id,
        preview.targets.map((t) => t.id),
        themeTags ?? [],
      );
      if ("error" in result) {
        setError(result.error);
      } else {
        router.push(`/story/${result.id}`);
      }
    } catch {
      setError("Posten hat gerade nicht geklappt. Bitte nochmal versuchen.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-xl bg-surface-2 p-4">
        <p className="text-sm font-medium text-fg">Charakter 1</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setChar1Mode("pool")}
            aria-pressed={char1Mode === "pool"}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              char1Mode === "pool" ? "bg-accent-strong text-on-accent-strong" : "bg-surface text-fg-soft hover:text-fg"
            }`}
          >
            Zufällig aus Pool
          </button>
          <button
            type="button"
            onClick={() => setChar1Mode("specific")}
            aria-pressed={char1Mode === "specific"}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              char1Mode === "specific" ? "bg-accent-strong text-on-accent-strong" : "bg-surface text-fg-soft hover:text-fg"
            }`}
          >
            Bestimmter Charakter
          </button>
        </div>

        {char1Mode === "specific" ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <WorldSelect
                worldOptions={[{ id: "alle", name: "Alle Welten", owners: [] }, ...worldOptions]}
                value={char1FilterWorld}
                onChange={setChar1FilterWorld}
              />
              <ProfilSelect owners={allOwners} value={char1FilterOwner} onChange={setChar1FilterOwner} />
            </div>
            <select
              value={char1Id}
              onChange={(e) => setChar1Id(e.target.value)}
              className="rounded-md border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-accent"
            >
              {filteredCharacterOptions.map((w) => (
                <optgroup key={w.worldId} label={w.worldName}>
                  {w.characters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.ownerLabel})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {filteredCharacterOptions.length === 0 && (
              <p className="text-xs text-muted">Kein Charakter passt zu dieser Filterkombination.</p>
            )}
            {!ownCharacters.some((c) => c.id === char1Id) && (
              <p className="text-xs text-muted">
                Kein eigener Charakter – die Szene wird als Erzähler:in gepostet (Autor:innenschaft bleibt technisch bei
                dir).
              </p>
            )}
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <GenderSelect value={char1Gender} onChange={setChar1Gender} />
            <ProfilSelect owners={activeWorldOwners} value={char1Owner} onChange={setChar1Owner} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-surface-2 p-4">
        <p className="text-sm font-medium text-fg">Schweregrad (optional)</p>
        <div className="grid grid-cols-2 gap-3">
          <SeveritySelect label="Mindestens" value={minSeverity} onChange={changeMinSeverity} />
          <SeveritySelect label="Höchstens" value={maxSeverity} onChange={changeMaxSeverity} />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-surface-2 p-4">
        <p className="text-sm font-medium text-fg">Kategorie (optional)</p>
        <div className="flex flex-wrap gap-2">
          {FATE_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => toggleCategory(category)}
              aria-pressed={selectedCategories.includes(category)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                selectedCategories.includes(category)
                  ? "bg-accent-strong text-on-accent-strong"
                  : "bg-surface text-fg-soft hover:text-fg"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        {selectedCategories.length === 0 && <p className="text-xs text-muted">Keine Auswahl = alle Kategorien.</p>}
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-surface-2 p-4">
        <label className="flex items-center gap-2 text-sm font-medium text-fg">
          <input
            type="checkbox"
            checked={extraEnabled}
            onChange={(e) => {
              setExtraEnabled(e.target.checked);
              if (!e.target.checked) setSlots([]);
              else if (slots.length === 0) setSlots([{ worldId: activeWorldId, gender: "alle", ownerId: "alle" }]);
            }}
            className="rounded border-line"
          />
          Weitere Charaktere einbeziehen
        </label>

        {extraEnabled && (
          <div className="flex flex-col gap-3">
            {slots.map((slot, i) => {
              const owners = worldOptions.find((w) => w.id === slot.worldId)?.owners ?? [];
              return (
                <div key={i} className="flex flex-col gap-2 rounded-lg border border-line p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-fg-soft">Charakter {i + 2}</p>
                    <button
                      type="button"
                      onClick={() => removeSlot(i)}
                      aria-label={`Charakter ${i + 2} entfernen`}
                      className="text-muted transition hover:text-fg"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </div>
                  {worldOptions.length > 1 && (
                    <WorldSelect
                      worldOptions={worldOptions}
                      value={slot.worldId}
                      onChange={(worldId) => updateSlot(i, { worldId, ownerId: "alle" })}
                    />
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <GenderSelect value={slot.gender} onChange={(g) => updateSlot(i, { gender: g })} />
                    <ProfilSelect owners={owners} value={slot.ownerId} onChange={(o) => updateSlot(i, { ownerId: o })} />
                  </div>
                </div>
              );
            })}
            {slots.length < 2 && (
              <button type="button" onClick={addSlot} className="self-start text-sm text-accent hover:underline">
                + weiteren Charakter hinzufügen
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-surface-2 p-4">
        <p className="text-sm font-medium text-fg">Themen-Generator (optional)</p>
        <p className="text-xs text-muted">
          Zieht zufällige Stichpunkte als Inspiration, unabhängig vom gewürfelten Schicksal – kann, muss aber nicht benutzt werden.
        </p>
        {themeTags && themeTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {themeTags.map((tag) => (
              <span key={tag} className="rounded-full border border-line px-2 py-0.5 text-xs text-fg-soft">
                {tag}
              </span>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={rollTheme}
          className="self-start rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-fg-soft transition hover:bg-surface-3 hover:text-fg"
        >
          {themeTags ? "Nochmal" : "Thema würfeln"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="button"
        onClick={roll}
        disabled={rolling}
        className="flex items-center justify-center gap-2 self-start rounded-md bg-accent-strong px-5 py-2 font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
      >
        <Skull className="h-4 w-4" strokeWidth={2} />
        {rolling ? "Würfle..." : preview ? "Nochmal würfeln" : "Würfeln"}
      </button>

      {preview && (
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-fg-soft">{preview.category}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${SEVERITY_STYLES[preview.severity] ?? ""}`}>
              {preview.severity}
            </span>
          </div>
          <p className="font-serif text-xl leading-snug text-fg">{preview.text}</p>
          <button
            type="button"
            onClick={post}
            disabled={posting}
            className="self-start rounded-md bg-accent-strong px-5 py-2 font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
          >
            {posting ? "Poste..." : "Als Szene posten"}
          </button>
        </div>
      )}
    </div>
  );
}
