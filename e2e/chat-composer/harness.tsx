// Testseite für den Chat-Raum (Eingabeleiste am Handy und am Laptop), ohne Server und Datenbank.
import { createRoot } from "react-dom/client";
import { ChatRoom } from "@/app/chats/[id]/chat-room";
import type { Character, Message } from "@/lib/types";

const me = { id: "c1", name: "Lyra Nachtfeder", avatar_url: null, owner_id: "u1" } as unknown as Character;
const other = { id: "c2", name: "Finn Murphy", avatar_url: null, owner_id: "u2" } as unknown as Character;
const second = { id: "c3", name: "Lyra Zweitfigur", avatar_url: null, owner_id: "u1" } as unknown as Character;
const withSecond = new URLSearchParams(location.search).has("zweite");
// ?gruppe=1: Gruppenchat; &admin=1: ich bin Gruppen-Admin (Ersteller:in ist u2, Finn)
const group = new URLSearchParams(location.search).has("gruppe");
const iAmAdmin = new URLSearchParams(location.search).has("admin");
const now = Date.now();
const messages = Array.from({ length: Number(new URLSearchParams(location.search).get("n")) || 6 }, (_, i) => ({
  id: `m${i}`,
  chat_id: "chat",
  character_id: i % 2 ? "c1" : "c2",
  content: i % 2 ? "Bin gleich da, wartet kurz auf mich!" : "Hast du schon gesehen, was im Park los ist?",
  created_at: new Date(now - (100 - i) * 60000).toISOString(),
  characters: i % 2 ? me : other,
  reactions: [],
})) as unknown as Message[];
// Nachricht einer anderen meiner Figuren (nicht der gerade gewählten): gehört mir, steht also rechts
if (withSecond) messages.push({ id: "mx", chat_id: "chat", character_id: "c3", content: "Von meiner zweiten Figur", created_at: new Date(now).toISOString(), characters: second, reactions: [] } as unknown as Message);

createRoot(document.getElementById("root")!).render(
  <div style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
    <ChatRoom
      chatId="chat"
      userId="u1"
      title={group ? "Die Runde" : "Finn Murphy"}
      isGroup={group}
      avatarUrl={null}
      canDelete isGroupAdmin={iAmAdmin} adminIds={group ? (iAmAdmin ? ["c1", "c2"] : ["c2"]) : []} creatorId={group ? "u2" : "u1"}
      participants={withSecond || group ? [me, other, second] : [me, other]}
      availableCharacters={[]}
      initialMessages={messages}
      activeCharacter={me}
      myCharacterIds={withSecond ? ["c1", "c3"] : ["c1"]}
      initialReads={[]}
      initialMuted={false}
      initialTheme={{} as never}
    />
  </div>,
);
