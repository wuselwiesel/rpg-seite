export type ChatWithMessages = {
  id: string;
  messages: { created_at: string; character_id: string }[];
  chat_participants: { character_id: string }[];
};

// Ungelesen = neuere Nachricht als der letzte Lesezeitpunkt, die nicht von einem
// eigenen Charakter kommt, der selbst nicht der Empfänger ist: Schreibt ein eigener
// Charakter einem anderen eigenen Charakter, ist der Chat für Letzteren ungelesen.
// Mit forCharacterId wird nur aus Sicht dieses Charakters gezählt.
export function computeUnreadCounts(
  chats: ChatWithMessages[],
  reads: { chat_id: string; last_read_at: string }[],
  myCharacterIds: string[],
  forCharacterId?: string,
): Record<string, number> {
  const readMap = new Map(reads.map((r) => [r.chat_id, r.last_read_at]));
  const counts: Record<string, number> = {};
  for (const chat of chats) {
    const lastRead = readMap.get(chat.id);
    const receivers = forCharacterId
      ? chat.chat_participants.filter((p) => p.character_id === forCharacterId).map((p) => p.character_id)
      : chat.chat_participants.filter((p) => myCharacterIds.includes(p.character_id)).map((p) => p.character_id);
    if (receivers.length === 0) continue;

    // Wer selbst geantwortet hat, hat vorher gelesen: für jede empfangende Figur zählen nur Nachrichten, die neuer sind als der letzte
    // Lesezeitpunkt und als ihre eigene letzte Nachricht (Antworten aus dem kleinen Chat-Fenster oder von einer Benachrichtigung aus
    // setzen den Lesezeitpunkt nicht immer). Schreibt eine eigene Figur einer anderen eigenen, bleibt es für die andere ungelesen.
    const base = lastRead ? new Date(lastRead).getTime() : 0;
    const readUntil = new Map<string, number>();
    for (const r of receivers) {
      let t = base;
      for (const m of chat.messages) if (m.character_id === r) t = Math.max(t, new Date(m.created_at).getTime());
      readUntil.set(r, t);
    }

    const count = chat.messages.filter((m) => {
      const t = new Date(m.created_at).getTime();
      return receivers.some((receiverId) => receiverId !== m.character_id && t > (readUntil.get(receiverId) ?? base));
    }).length;
    if (count > 0) counts[chat.id] = count;
  }
  return counts;
}
