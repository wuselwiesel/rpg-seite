import { LEVEL_LABELS, PERMISSION_DEFS, type WorldPermissions } from "@/lib/world-permissions";

// Rechte-Tabelle einer Welt: je Aktion eine Auswahl (alle Mitglieder / nur eigene / nur Admins).
export function PermissionFields({ value }: { value: WorldPermissions }) {
  return (
    <fieldset data-tour="welt-rechte" className="flex flex-col gap-3 rounded-xl border border-line p-4">
      <legend className="px-1 text-sm font-medium text-fg">Rechte der Mitglieder</legend>
      {PERMISSION_DEFS.map((def) => (
        <label key={def.key} className="flex flex-col gap-1 text-sm text-fg-soft sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          {def.label}
          <select
            name={`perm_${def.key}`}
            defaultValue={value[def.key]}
            className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent sm:w-56"
          >
            {def.options.map((o) => (
              <option key={o} value={o}>
                {LEVEL_LABELS[o]}
              </option>
            ))}
          </select>
        </label>
      ))}
    </fieldset>
  );
}
