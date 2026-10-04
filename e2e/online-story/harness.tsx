// Testseite: Online-Anzeige der Welt (Story) und „schreibt …“ in Chats.
import { createRoot } from "react-dom/client";
import { OnlineProvider, OnlineAnyDot } from "@/components/online-status";
import { OnlineMembers } from "@/components/online-members";
import { TypingLine } from "@/components/typing-line";
import { useTyping } from "@/lib/use-typing";

const members = [
  { id: "me", name: "Ich", avatarUrl: null },
  { id: "a", name: "Hörnchen", avatarUrl: null },
  { id: "b", name: "Streuselschnecke", avatarUrl: null },
  { id: "c", name: "Offline-Person", avatarUrl: null },
  { id: "d", name: "Dora", avatarUrl: null },
  { id: "e", name: "Emil", avatarUrl: null },
  { id: "f", name: "Fritz", avatarUrl: null },
  { id: "g", name: "Gina", avatarUrl: null },
];

function Typing() {
  const t = useTyping("test-typing", "me", "Ich");
  return (
    <div>
      <button type="button" onClick={t.announce}>
        tippen
      </button>
      <button type="button" onClick={t.clear}>
        leeren
      </button>
      <div data-testid="typing">
        <TypingLine names={t.names} />
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <OnlineProvider userId="me" initialMode="online">
    <div style={{ maxWidth: 640, padding: 16 }} className="flex flex-col gap-4 text-fg">
      <div data-testid="story-head" className="flex items-center gap-3">
        <h1 className="font-serif text-3xl">Story</h1>
        <p className="min-w-0 flex-1 truncate text-sm text-muted">Testwelt</p>
        <OnlineMembers members={members} selfId="me" className="shrink-0" />
      </div>
      <p data-testid="empty">
        <OnlineMembers members={[members[0], members[3]]} selfId="me" />
      </p>
      <span data-testid="any" className="relative inline-block h-10 w-10 rounded-full bg-surface-2">
        <OnlineAnyDot userIds={["c", "d"]} overlay />
      </span>
      <span data-testid="none" className="relative inline-block h-10 w-10 rounded-full bg-surface-2">
        <OnlineAnyDot userIds={["c"]} overlay />
      </span>
      <Typing />
    </div>
  </OnlineProvider>,
);
