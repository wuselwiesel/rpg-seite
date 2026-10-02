"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Heart, SmilePlus, X } from "lucide-react";
import { EmojiCatalog } from "@/components/emoji-catalog";
import { EmojiText } from "@/components/custom-emoji-provider";
import { getRedaktionReactors, toggleRedaktionReaction, type RedaktionReactor } from "./actions";
import { CharacterAvatar } from "@/components/character-avatar";
import type { ReactionSummary } from "@/lib/reactions";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

// Likes (Herz) und Emoji-Reaktionen auf Redaktions-Beiträge – pro Account, nicht pro Charakter.
export function RedaktionReactionBar({
  postId,
  initialReactions,
  commentSlot,
}: {
  postId: string;
  initialReactions: ReactionSummary[];
  commentSlot?: React.ReactNode;
}) {
  const [reactions, setReactions] = useState(initialReactions);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [reactors, setReactors] = useState<RedaktionReactor[] | null>(null);
  const [beat, setBeat] = useState(0);
  const [, startTransition] = useTransition();

  const heart = reactions.find((r) => r.emoji === "❤️");
  const liked = Boolean(heart?.reactedByMe);
  const total = reactions.reduce((sum, r) => sum + r.count, 0);
  const chips = reactions.filter((r) => r.emoji !== "❤️");

  function toggle(emoji: string) {
    setReactions((prev) => {
      const existing = prev.find((r) => r.emoji === emoji);
      if (existing) {
        const next = existing.count + (existing.reactedByMe ? -1 : 1);
        if (next <= 0) return prev.filter((r) => r.emoji !== emoji);
        return prev.map((r) => (r.emoji === emoji ? { ...r, count: next, reactedByMe: !existing.reactedByMe } : r));
      }
      return [...prev, { emoji, count: 1, reactedByMe: true }];
    });
    setPickerOpen(false);
    startTransition(async () => {
      await toggleRedaktionReaction(postId, emoji);
    });
  }

  function openList() {
    setListOpen(true);
    setReactors(null);
    getRedaktionReactors(postId).then(setReactors);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => {
            setBeat((b) => b + 1);
            toggle("❤️");
          }}
          aria-pressed={liked}
          aria-label={liked ? "Gefällt mir nicht mehr" : "Gefällt mir"}
          className="flex items-center text-fg transition-transform duration-150 active:scale-75"
        >
          <Heart
            key={beat}
            className={`h-7 w-7 transition-colors ${beat > 0 && liked ? "heart-beat" : ""} ${
              liked ? "fill-[#ed4956] text-[#ed4956]" : ""
            }`}
            strokeWidth={liked ? 0 : 1.75}
          />
        </button>
        {commentSlot}
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          title="Reaktion hinzufügen"
          aria-label="Reaktion hinzufügen"
          className="ml-auto flex h-7 w-7 items-center justify-center text-fg transition duration-150 hover:text-muted active:scale-75"
        >
          <SmilePlus className="h-6 w-6" strokeWidth={1.75} />
        </button>
      </div>

      {total > 0 && (
        <button type="button" onClick={openList} className="w-fit text-left text-sm font-semibold text-fg hover:underline">
          {heart?.sampleName
            ? heart.count > 1
              ? `${heart.sampleName} und ${heart.count - 1} ${heart.count - 1 === 1 ? "anderem" : "anderen"} gefällt der Beitrag`
              : `${heart.sampleName} gefällt der Beitrag`
            : heart
              ? heart.count === 1
                ? "1 Person gefällt der Beitrag"
                : `${heart.count} Personen gefällt der Beitrag`
              : total === 1
                ? "1 Reaktion"
                : `${total} Reaktionen`}
        </button>
      )}

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {chips.map((r) => (
            <button
              key={r.emoji}
              type="button"
              onClick={() => toggle(r.emoji)}
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition ${
                r.reactedByMe ? "bg-accent-strong/20 text-accent" : "bg-surface-2 text-fg-soft hover:bg-surface-3"
              }`}
            >
              <span><EmojiText text={r.emoji} /></span>
              <span>{r.count}</span>
            </button>
          ))}
        </div>
      )}

      {listOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <button type="button" onClick={() => setListOpen(false)} aria-label="Schließen" className="absolute inset-0" />
            <div className="relative flex max-h-[70vh] w-full max-w-sm flex-col rounded-2xl border border-line bg-surface shadow-xl">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <h2 className="font-serif text-lg text-fg">Reaktionen</h2>
                <button
                  type="button"
                  onClick={() => setListOpen(false)}
                  title="Schließen"
                  className="rounded-full p-1 text-muted transition hover:bg-surface-2 hover:text-fg"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
              <ul className="overflow-y-auto p-2">
                {reactors === null && <li className="px-3 py-4 text-sm text-muted">Lädt...</li>}
                {reactors?.length === 0 && <li className="px-3 py-4 text-sm text-muted">Noch keine Reaktionen.</li>}
                {reactors?.map((r, i) => (
                  <li key={`${r.user.id}-${r.emoji}-${i}`}>
                    <Link
                      href={`/redaktion/profil/${r.user.id}`}
                      onClick={() => setListOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-surface-2"
                    >
                      <CharacterAvatar name={r.user.nickname || r.user.username} avatarUrl={r.user.avatar_url} size={36} />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">
                        {r.user.nickname || r.user.username}
                      </span>
                      <span className="text-xl"><EmojiText text={r.emoji} /></span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>,
          document.body,
        )}

      {pickerOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <button type="button" onClick={() => setPickerOpen(false)} aria-label="Schließen" className="absolute inset-0" />
            <div className="relative flex flex-col gap-2 rounded-2xl border border-line bg-surface p-3 shadow-xl">
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-0.5">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => toggle(emoji)}
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
              <EmojiCatalog onPick={toggle} height={400} />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
