// Testseite für den Chat-Raum (Eingabeleiste am Handy und am Laptop), ohne Server und Datenbank.
import { createRoot } from "react-dom/client";
import { ChatRoom } from "@/app/chats/[id]/chat-room";
import type { Character, Message } from "@/lib/types";

const me = { id: "c1", name: "Lyra Nachtfeder", avatar_url: null, owner_id: "u1" } as unknown as Character;
const other = { id: "c2", name: "Finn Murphy", avatar_url: null, owner_id: "u2" } as unknown as Character;
const now = Date.now();
const messages = Array.from({ length: 6 }, (_, i) => ({
  id: `m${i}`,
  chat_id: "chat",
  character_id: i % 2 ? "c1" : "c2",
  content: i % 2 ? "Bin gleich da, wartet kurz auf mich!" : "Hast du schon gesehen, was im Park los ist?",
  created_at: new Date(now - (6 - i) * 60000).toISOString(),
  characters: i % 2 ? me : other,
  reactions: [],
})) as unknown as Message[];

createRoot(document.getElementById("root")!).render(
  <div style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
    <ChatRoom
      chatId="chat"
      userId="u1"
      title="Finn Murphy"
      isGroup={false}
      avatarUrl={null}
      canDelete
      participants={[me, other]}
      availableCharacters={[]}
      initialMessages={messages}
      activeCharacter={me}
      myCharacterIds={["c1"]}
      initialReads={[]}
      initialMuted={false}
      initialTheme={{} as never}
    />
  </div>,
);
