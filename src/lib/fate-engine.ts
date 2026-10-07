// Auswahl-Logik des Schicksalswürfels: rein funktional, kennt weder UI noch Datenbank.
import { FATES } from "@/lib/fate-data";
import { SEVERITY_ORDER } from "@/lib/fate-types";
import type {
  Char1Config,
  CharacterMeta,
  Fate,
  FateCategory,
  FateRollResult,
  FateRoleRequirement,
  GenderFilter,
  OwnerFilter,
  SeverityRange,
  SlotConfig,
} from "@/lib/fate-types";

function genderMatchesFilter(c: CharacterMeta, filter: GenderFilter): boolean {
  if (filter === "alle") return true;
  return c.gender === filter;
}

function ownerMatchesFilter(c: CharacterMeta, filter: OwnerFilter): boolean {
  if (filter === "alle") return true;
  return c.ownerId === filter;
}

function satisfiesRole(c: CharacterMeta, role: FateRoleRequirement | undefined): boolean {
  if (!role) return true;
  if (role.gender && c.gender !== role.gender) return false;
  if (role.species && role.species.length > 0 && !role.species.includes(c.species)) return false;
  return true;
}

// Nur für Zusatz-Charaktere: muss laut character1s Profil wirklich die Partnerin/der beste Freund sein.
// Ist bei character1 keine Partnerin/kein bester Freund hinterlegt, kann diese Rolle nicht besetzt werden.
function satisfiesRelation(c: CharacterMeta, role: FateRoleRequirement | undefined, char1: CharacterMeta): boolean {
  if (!role?.relation) return true;
  if (role.relation === "partner") return !!char1.partnerId && char1.partnerId === c.id;
  if (role.relation === "bestFriend") return !!char1.bestFriendId && char1.bestFriendId === c.id;
  return true;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function renderFateText(fate: Fate, char1: CharacterMeta, targets: CharacterMeta[]): string {
  const template = targets.length === fate.maxTargets ? fate.text : (fate.soloText ?? fate.text);
  let out = template.split("{character1}").join(char1.name);
  targets.forEach((target, i) => {
    out = out.split(`{character${i + 2}}`).join(target.name);
  });
  return out;
}

// Versucht, für ein gegebenes Schicksal Charakter 1 und die benötigten Zusatz-Charaktere
// zu besetzen. Gibt null zurück, wenn die aktuelle Auswahl/Filter-Kombination dafür keine
// gültigen Charaktere hergibt.
function tryAssign(
  fate: Fate,
  char1Candidates: CharacterMeta[],
  targetPool: CharacterMeta[],
  slots: SlotConfig[],
): { char1: CharacterMeta; targets: CharacterMeta[] } | null {
  const eligibleChar1 = char1Candidates.filter((c) => satisfiesRole(c, fate.char1));
  if (eligibleChar1.length === 0) return null;
  const char1 = pickRandom(eligibleChar1);

  const maxFill = Math.min(fate.maxTargets, slots.length);
  for (let fillCount = maxFill; fillCount >= fate.minTargets; fillCount--) {
    const used = new Set([char1.id]);
    const targets: CharacterMeta[] = [];
    let ok = true;
    for (let i = 0; i < fillCount; i++) {
      const role = fate.roles?.[i];
      const slot = slots[i];
      const candidates = targetPool.filter(
        (c) =>
          !used.has(c.id) &&
          c.worldId === slot.worldId &&
          genderMatchesFilter(c, slot.gender) &&
          ownerMatchesFilter(c, slot.ownerId) &&
          satisfiesRole(c, role) &&
          satisfiesRelation(c, role, char1),
      );
      if (candidates.length === 0) {
        ok = false;
        break;
      }
      const picked = pickRandom(candidates);
      used.add(picked.id);
      targets.push(picked);
    }
    if (ok) return { char1, targets };
  }
  return null;
}

export function rollFate(
  // Kandidaten für Charakter 1 - im "pool"-Modus je nach Profil-Filter auch fremde Charaktere.
  char1Pool: CharacterMeta[],
  targetPool: CharacterMeta[],
  char1Config: Char1Config,
  slots: SlotConfig[],
  severityRange: SeverityRange,
  categories: FateCategory[] = [],
  // Eigene Schicksale der Welt, die unter die eingebauten gemischt werden
  customFates: Fate[] = [],
): FateRollResult | { error: string } {
  const numSlots = slots.length;
  const minIndex = SEVERITY_ORDER.indexOf(severityRange.min);
  const maxIndex = SEVERITY_ORDER.indexOf(severityRange.max);
  const eligible = [...FATES, ...customFates].filter((f) => {
    const i = SEVERITY_ORDER.indexOf(f.severity);
    // Wurde ein Zusatz-Charakter konfiguriert, sollen auch nur Schicksale gewürfelt werden,
    // die tatsächlich einen weiteren Charakter einbinden können (keine reinen Solo-Schicksale).
    const usesExtraCharacter = numSlots === 0 || f.maxTargets >= 1;
    const categoryOk = categories.length === 0 || categories.includes(f.category);
    return f.minTargets <= numSlots && i >= minIndex && i <= maxIndex && usesExtraCharacter && categoryOk;
  });
  if (eligible.length === 0) return { error: "Keine passenden Schicksale für diese Auswahl gefunden." };

  const char1Candidates =
    char1Config.mode === "specific"
      ? char1Pool.filter((c) => c.id === char1Config.characterId)
      : char1Pool.filter(
          (c) => genderMatchesFilter(c, char1Config.gender) && ownerMatchesFilter(c, char1Config.ownerId),
        );
  if (char1Candidates.length === 0) return { error: "Kein Charakter passt zu dieser Auswahl für Charakter 1." };

  for (const fate of shuffle(eligible)) {
    const assignment = tryAssign(fate, char1Candidates, targetPool, slots);
    if (!assignment) continue;
    return {
      fate,
      char1: assignment.char1,
      targets: assignment.targets,
      text: renderFateText(fate, assignment.char1, assignment.targets),
    };
  }

  return { error: "Für diese Filterkombination konnte kein passendes Schicksal gefunden werden. Versuch es mit weniger Einschränkungen." };
}
