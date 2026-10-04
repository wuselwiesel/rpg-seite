// Testseite für den Online-Status: Punkt, Emoji statt Punkt, Text, offline = nichts, Einstellungen.
import { createRoot } from "react-dom/client";
import { OnlineBadge, OnlineCount, OnlineDot, OnlineProvider } from "@/components/online-status";
import { PresenceSettings } from "@/components/presence-settings";

createRoot(document.getElementById("root")!).render(
  <OnlineProvider userId="me" initialMode="online" initialEmoji={null} initialText={null}>
    <div style={{ maxWidth: 640, padding: 16 }} className="flex flex-col gap-4 text-fg">
      <ul className="flex flex-col gap-2">
        {["dot", "emoji", "emojitext", "offline"].map((id) => (
          <li key={id} data-user={id} className="flex items-center gap-3">
            <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-2">
              {id}
              <OnlineDot userId={id} overlay />
            </span>
            <OnlineBadge userId={id} />
          </li>
        ))}
      </ul>
      <p data-testid="count">
        <OnlineCount userIds={["dot", "emoji", "offline", "me"]} selfId="me" />
      </p>
      <PresenceSettings />
    </div>
  </OnlineProvider>,
);
