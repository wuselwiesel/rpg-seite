// Auswahl-Logik des Schicksalswürfels: rein funktional, kennt weder UI noch Datenbank.
import { FATES } from "@/lib/fate-data";
import type {
  Char1Config,
  CharacterMeta,
  Fate,
  FateRollResult,
  FateRoleRequirement,
  GenderFilter,
  SlotConfig,
  SpeciesFilter,
} from "@/lib/fate-types";

function genderMatchesFilter(c: CharacterMeta, filter: GenderFilter): boolean {
  if (filter === "alle") return true;
  return c.gender === filter;
}

function speciesMatchesFilter(c: CharacterMeta, filter: SpeciesFilter): boolean {
  if (filter === "alle") return true;
  return c.species === filter;
}

function satisfiesRole(c: CharacterMeta, role: FateRoleRequirement | undefined): boolean {
  if (!role) return true;
  if (role.gender && c.gender !== role.gender) return false;
  if (role.species && role.species.length > 0 && !role.species.includes(c.species)) return false;
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
          genderMatchesFilter(c, slot.gender) &&
          speciesMatchesFilter(c, slot.species) &&
          satisfiesRole(c, role),
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
  ownPool: CharacterMeta[],
  targetPool: CharacterMeta[],
  char1Config: Char1Config,
  slots: SlotConfig[],
): FateRollResult | { error: string } {
  const numSlots = slots.length;
  const eligible = FATES.filter((f) => f.minTargets <= numSlots);
  if (eligible.length === 0) return { error: "Keine passenden Schicksale für diese Auswahl gefunden." };

  const char1Candidates =
    char1Config.mode === "specific"
      ? ownPool.filter((c) => c.id === char1Config.characterId)
      : ownPool.filter((c) => genderMatchesFilter(c, char1Config.gender) && speciesMatchesFilter(c, char1Config.species));
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
