// Rechte-Tabelle einer Welt: je Aktion, wer sie ausführen darf. Admins (Besitzer:in und ernannte) dürfen immer alles.
export type PermissionKey = "wiki_create" | "wiki_edit" | "wiki_structure" | "story_create" | "arc_create";
export type PermissionLevel = "all" | "own" | "admins";

export const PERMISSION_DEFS: {
  key: PermissionKey;
  label: string;
  options: PermissionLevel[];
  // Voreinstellung für neu angelegte Welten; bestehende Welten bleiben offen („all“).
  strictDefault: PermissionLevel;
}[] = [
  { key: "wiki_create", label: "Wiki-Seiten anlegen", options: ["all", "admins"], strictDefault: "all" },
  { key: "wiki_edit", label: "Wiki-Seiten bearbeiten", options: ["all", "own", "admins"], strictDefault: "own" },
  { key: "wiki_structure", label: "Ordner, Karten und Typen ändern", options: ["all", "admins"], strictDefault: "admins" },
  { key: "story_create", label: "Szenen starten", options: ["all", "admins"], strictDefault: "all" },
  { key: "arc_create", label: "Handlungsstränge anlegen", options: ["all", "admins"], strictDefault: "all" },
];

export const LEVEL_LABELS: Record<PermissionLevel, string> = {
  all: "Alle Mitglieder",
  own: "Nur eigene Seiten",
  admins: "Nur Admins",
};

export type WorldPermissions = Record<PermissionKey, PermissionLevel>;

const KEYS = PERMISSION_DEFS.map((d) => d.key);

// Fehlende oder ungültige Einträge gelten als „alle“ (so verhalten sich bestehende Welten wie bisher).
export function parsePermissions(raw: unknown): WorldPermissions {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out = {} as WorldPermissions;
  for (const def of PERMISSION_DEFS) {
    const v = src[def.key];
    out[def.key] = typeof v === "string" && (def.options as string[]).includes(v) ? (v as PermissionLevel) : "all";
  }
  return out;
}

export function strictPermissions(): WorldPermissions {
  const out = {} as WorldPermissions;
  for (const def of PERMISSION_DEFS) out[def.key] = def.strictDefault;
  return out;
}

// Liest die Auswahlfelder `perm_<key>` aus dem Formular; `fallback` gilt für fehlende Felder.
export function permissionsFromForm(formData: FormData, fallback: WorldPermissions): WorldPermissions {
  const out = { ...fallback };
  for (const def of PERMISSION_DEFS) {
    const v = formData.get(`perm_${def.key}`);
    if (typeof v === "string" && (def.options as string[]).includes(v)) out[def.key] = v as PermissionLevel;
  }
  return out;
}

export type WorldRights = {
  isAdmin: boolean;
  wikiCreate: boolean;
  // all: jede Seite, own: nur selbst angelegte, none: keine
  wikiEdit: "all" | "own" | "none";
  wikiStructure: boolean;
  storyCreate: boolean;
  arcCreate: boolean;
};

export const FULL_RIGHTS: WorldRights = { isAdmin: true, wikiCreate: true, wikiEdit: "all", wikiStructure: true, storyCreate: true, arcCreate: true };

export function resolveRights(perms: WorldPermissions, isAdmin: boolean): WorldRights {
  if (isAdmin) return FULL_RIGHTS;
  return {
    isAdmin: false,
    wikiCreate: perms.wiki_create === "all",
    wikiEdit: perms.wiki_edit === "all" ? "all" : perms.wiki_edit === "own" ? "own" : "none",
    wikiStructure: perms.wiki_structure === "all",
    storyCreate: perms.story_create === "all",
    arcCreate: perms.arc_create === "all",
  };
}

export function canEditWikiPage(rights: WorldRights, createdBy: string | null, userId: string | null): boolean {
  if (rights.wikiEdit === "all") return true;
  return rights.wikiEdit === "own" && !!userId && createdBy === userId;
}

// Datenbankfehler „row-level security“ (42501) als verständliche Meldung.
export function permissionError(error: { code?: string; message: string }): string {
  return error.code === "42501" ? "Das dürfen in dieser Welt nur Admins." : error.message;
}

export { KEYS as PERMISSION_KEYS };
