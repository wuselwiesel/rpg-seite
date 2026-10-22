// Testseite: Chat-Nachrichten; Reaktions-Knopf erst nach Antippen
import { createRoot } from "react-dom/client";
import { MessageBubble } from "@/app/chats/[id]/message-bubble";

const me: any = { id: "c1", name: "Scott", avatar_url: null };
const msg = (id: string, content: string): any => ({ id, chat_id: "x", character_id: "c2", content, created_at: "2026-10-22T20:00:00Z", characters: { id: "c2", name: "Dana", avatar_url: null } });
const noop = () => {};

function App() {
  return (
    <div style={{ padding: 20, maxWidth: 420 }}>
      <div id="m1"><MessageBubble message={msg("m1", "Ohne Reaktion")} isOwn={false} activeCharacter={me} reactions={[]} editing={false} editDraft="" onEditDraft={noop} onStartEdit={noop} onSaveEdit={noop} onCancelEdit={noop} onDelete={noop} onReply={noop} /></div>
      <div id="m2" style={{ marginTop: 16 }}><MessageBubble message={msg("m2", "Mit Reaktion")} isOwn={false} activeCharacter={me} reactions={[{ emoji: "👍", count: 2, reactedByMe: false }]} editing={false} editDraft="" onEditDraft={noop} onStartEdit={noop} onSaveEdit={noop} onCancelEdit={noop} onDelete={noop} onReply={noop} /></div>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
