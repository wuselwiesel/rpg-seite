// Ohne Würfeln hat der Bogen weder Attribute noch Talente und ist nur ein Steckbrief: Dann heißt er auch so.
export function chaboLabel(diceEnabled: boolean): string {
  return diceEnabled ? "ChaBo" : "Steckbrief";
}
