"use client";

import { useRef, useState, useTransition } from "react";
import { SmilePlus } from "lucide-react";
import { toggleReaction } from "@/app/reactions/actions";
import type { ReactionSummary } from "@/lib/reactions";

const EMOJI_CHOICES = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

export function ReactionBar({
  target,
  initialReactions,
}: {
  target: { postId: string } | { messageId: string; characterId: string };
  initialReactions: ReactionSummary[];
}) {
  const [reactions, setReactions] = useState(initialReactions);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [, startTransition] = useTransition();
  const pickerRef = useRef<HTMLDivElement>(null);

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
            r.reactedByMe ? "bg-accent-strong/20 text-accent" : "bg-surface-2 text-fg-soft hover:bg-surface-3"
          }`}
        >
          <span>{r.emoji}</span>
          <span>{r.count}</span>
        </button>
      ))}

      <div ref={pickerRef} className="relative">
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          title="Reaktion hinzufügen"
          className="flex h-6 w-6 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg"
        >
          <SmilePlus className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        {pickerOpen && (
          <div className="absolute bottom-full left-0 z-10 mb-1 flex gap-0.5 rounded-full border border-line bg-surface p-1 shadow-lg">
            {EMOJI_CHOICES.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleToggle(emoji)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-base transition hover:bg-surface-2"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
