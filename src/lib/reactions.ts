export type ReactionSummary = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
  // Name eines echten Reagierenden (für "X und Y anderen gefällt..."); wer zuerst kommt, gewinnt.
  sampleName?: string;
};

export function aggregateReactions(
  rows: { emoji: string; character_id: string; characters?: { name: string } | null }[] | null | undefined,
  myCharacterIds: Set<string>,
): ReactionSummary[] {
  const byEmoji = new Map<string, ReactionSummary>();
  for (const row of rows ?? []) {
    const existing = byEmoji.get(row.emoji);
    if (existing) {
      existing.count += 1;
      if (myCharacterIds.has(row.character_id)) existing.reactedByMe = true;
      if (!existing.sampleName && row.characters?.name) existing.sampleName = row.characters.name;
    } else {
      byEmoji.set(row.emoji, {
        emoji: row.emoji,
        count: 1,
        reactedByMe: myCharacterIds.has(row.character_id),
        sampleName: row.characters?.name,
      });
    }
  }
  return Array.from(byEmoji.values());
}
