import { activeLists, type ChoiceList } from "@/lib/choice-lists";

const control = "rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent";

// Ein Feld für eine Auswahlliste der Welt: Dropdown oder freies Textfeld. Feldname `choice_<ListenID>`.
export function ChoiceField({ list, value }: { list: ChoiceList; value?: string }) {
  const name = `choice_${list.id}`;
  if (list.mode === "text") {
    return (
      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        {list.label}
        <input type="text" name={name} defaultValue={value ?? ""} maxLength={60} className={control} />
      </label>
    );
  }
  // Ein früher gewählter Wert, der nicht mehr in der Liste steht, bleibt auswählbar, bis man ihn ändert.
  const legacy = value && !list.options.some((o) => o.label === value) ? value : null;
  return (
    <label className="flex flex-col gap-1 text-sm text-fg-soft">
      {list.label}
      <select name={name} defaultValue={value ?? ""} className={control}>
        <option value="">–</option>
        {legacy && <option value={legacy}>{legacy}</option>}
        {list.options.map((o) => {
          // Voll vergebene Einträge (Höchstzahl der Welt) bleiben sichtbar, aber nicht wählbar; der eigene Wert bleibt wählbar
          const full = o.maxCount != null && (o.used ?? 0) >= o.maxCount && o.label !== value;
          return (
            <option key={o.id} value={o.label} disabled={full}>
              {full ? `${o.label} (voll)` : o.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}

// Alle aktiven Listen außer „Wesen“ (die ersetzt die feste Auswahl und wird dort eingebunden).
export function ChoiceFields({ lists, values }: { lists: ChoiceList[]; values?: Record<string, string> }) {
  const others = activeLists(lists).filter((l) => !l.isSpecies);
  if (others.length === 0) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {others.map((l) => (
        <ChoiceField key={l.id} list={l} value={values?.[l.id]} />
      ))}
    </div>
  );
}
