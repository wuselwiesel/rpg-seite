export type ReactionSummary = { emoji: string; count: number; reactedByMe: boolean };

export function aggregateReactions(
  rows: { emoji: string; character_id: string }[] | null | undefined,
  myCharacterIds: Set<string>,
): ReactionSummary[] {
  const byEmoji = new Map<string, ReactionSummary>();
  for (const row of rows ?? []) {
    const existing = byEmoji.get(row.emoji);
    if (existing) {
      existing.count += 1;
      if (myCharacterIds.has(row.character_id)) existing.reactedByMe = true;
    } else {
      byEmoji.set(row.emoji, {
        emoji: row.emoji,
        count: 1,
        reactedByMe: myCharacterIds.has(row.character_id),
      });
    }
  }
  return Array.from(byEmoji.values());
}
