"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { createPortal } from "react-dom";
import { SmilePlus, X } from "lucide-react";
import EmojiPicker, { Theme, type EmojiClickData } from "emoji-picker-react";
import { toggleReaction } from "@/app/reactions/actions";
import type { ReactionSummary } from "@/lib/reactions";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

function subscribeToThemeChange(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function getIsDarkSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getIsDarkServerSnapshot() {
  return false;
}

function useIsDarkMode() {
  return useSyncExternalStore(subscribeToThemeChange, getIsDarkSnapshot, getIsDarkServerSnapshot);
}

export function ReactionBar({
  target,
  initialReactions,
  onBubble = false,
}: {
  onBubble?: boolean;
  target: { postId: string } | { messageId: string; characterId: string };
  initialReactions: ReactionSummary[];
}) {
  const [reactions, setReactions] = useState(initialReactions);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [, startTransition] = useTransition();
  const isDark = useIsDarkMode();

  useEffect(() => {
    if (!pickerOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setPickerOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [pickerOpen]);

  function handleToggle(emoji: string) {
    setReactions((prev) => {
      const existing = prev.find((r) => r.emoji === emoji);
      if (existing) {
        const nextCount = existing.count + (existing.reactedByMe ? -1 : 1);
        if (nextCount <= 0) return prev.filter((r) => r.emoji !== emoji);
        return prev.map((r) =>
          r.emoji === emoji ? { ...r, count: nextCount, reactedByMe: !existing.reactedByMe } : r,
        );
      }
      return [...prev, { emoji, count: 1, reactedByMe: true }];
    });
    setPickerOpen(false);
    startTransition(async () => {
      await toggleReaction(target, emoji);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          onClick={() => handleToggle(r.emoji)}
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition ${
            onBubble
              ? r.reactedByMe
                ? "bg-current/25 text-current ring-1 ring-current/60"
                : "bg-current/10 text-current"
              : r.reactedByMe
                ? "bg-accent-strong/20 text-accent"
                : "bg-surface-2 text-fg-soft hover:bg-surface-3"
          }`}
        >
          <span>{r.emoji}</span>
          <span>{r.count}</span>
        </button>
      ))}

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        title="Reaktion hinzufügen"
        className={`flex h-6 w-6 items-center justify-center rounded-full transition ${
          onBubble ? "text-current opacity-80 hover:bg-current/15" : "text-muted hover:bg-surface-2 hover:text-fg"
        }`}
      >
        <SmilePlus className="h-3.5 w-3.5" strokeWidth={2} />
      </button>

      {pickerOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              aria-label="Schließen"
              className="absolute inset-0"
            />
            <div className="relative flex flex-col gap-2 rounded-2xl border border-line bg-surface p-3 shadow-xl">
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-0.5">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleToggle(emoji)}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-lg transition hover:bg-surface-2"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  title="Schließen"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
              <EmojiPicker
                onEmojiClick={(data: EmojiClickData) => handleToggle(data.emoji)}
                theme={isDark ? Theme.DARK : Theme.LIGHT}
                searchPlaceholder="Emoji suchen..."
                width={320}
                height={400}
                previewConfig={{ showPreview: false }}
                lazyLoadEmojis
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
