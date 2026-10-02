"use client";

import { useSyncExternalStore } from "react";
import { BUBBLE_CHANGE_EVENT, BUBBLE_ENABLED_KEY, isBubbleEnabled } from "./chat-bubble";

function subscribe(callback: () => void) {
  window.addEventListener(BUBBLE_CHANGE_EVENT, callback);
  return () => window.removeEventListener(BUBBLE_CHANGE_EVENT, callback);
}

export function ChatBubbleToggle() {
  const enabled = useSyncExternalStore(subscribe, isBubbleEnabled, () => true);

  function toggle() {
    try {
      localStorage.setItem(BUBBLE_ENABLED_KEY, enabled ? "off" : "on");
    } catch {
      /* egal */
    }
    window.dispatchEvent(new Event(BUBBLE_CHANGE_EVENT));
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg">Chat-Blase anzeigen</p>
        <p className="text-xs text-muted">
          Schwebender Knopf auf allen Seiten, mit dem du nebenbei chatten kannst. Gilt für dieses Gerät.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={toggle}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${enabled ? "bg-accent-strong" : "bg-surface-3"}`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}
