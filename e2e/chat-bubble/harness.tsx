// Testseite für die Chat-Blase (verschieben, öffnen), ohne Server und Datenbank.
import { createRoot } from "react-dom/client";
import { ChatBubble } from "@/components/chat-bubble";

const unread = new URLSearchParams(location.search).get("unread") === "1";
(window as unknown as { __unread: boolean }).__unread = unread;

createRoot(document.getElementById("root")!).render(
  <div style={{ minHeight: "100dvh" }}>
    <ChatBubble userId="u1" myCharacterIds={["c1"]} initialRpUnread={unread ? { chatA: 2 } : {}} initialAccountUnread={{}} />
  </div>,
);
