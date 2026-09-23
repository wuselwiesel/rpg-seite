"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Heart, Pencil, SmilePlus, X } from "lucide-react";
import EmojiPicker, { Theme, type EmojiClickData } from "emoji-picker-react";
import Link from "next/link";
import { toggleReaction, getPostReactors, setBonusLikes, type Reactor } from "@/app/reactions/actions";
import { CharacterAvatar } from "./character-avatar";
import { POST_LIKE_EVENT } from "./double-tap-like";
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
  heart = false,
  commentSlot,
  myCharacters = [],
  activeCharacterId,
  bonusLikes = 0,
  isOwn = false,
}: {
  onBubble?: boolean;
  // Instagram-Stil: Herz-Button (❤️), danach `commentSlot`, dann Emoji-Auswahl; weitere Reaktionen darunter.
  heart?: boolean;
  commentSlot?: React.ReactNode;
  target: { postId: string } | { messageId: string; characterId: string };
  initialReactions: ReactionSummary[];
  // Eigene Charaktere in der Welt dieses Beitrags: erlaubt, mit einem beliebigen von ihnen zu liken,
  // nicht nur mit dem gerade aktiven. Nur für `heart` (Beiträge) relevant.
  myCharacters?: { id: string; name: string; avatar_url: string | null }[];
  activeCharacterId?: string;
  // Zusätzliche, nicht echte Likes obendrauf (nur für `heart`/Beiträge; von der Besitzerin/dem
  // Besitzer frei wählbar, siehe `isOwn`).
  bonusLikes?: number;
  isOwn?: boolean;
}) {
  const [reactions, setReactions] = useState(initialReactions);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [reactors, setReactors] = useState<Reactor[] | null>(null);
  const [charPickerOpen, setCharPickerOpen] = useState(false);
  const [myLikes, setMyLikes] = useState<Set<string> | null>(null);
  const [bonusLikesState, setBonusLikesState] = useState(bonusLikes);
  const [boostOpen, setBoostOpen] = useState(false);
  const [boostInput, setBoostInput] = useState(String(bonusLikes));
  const [boostSaving, setBoostSaving] = useState(false);
  const total = reactions.reduce((sum, r) => sum + r.count, 0);
  const postId = "postId" in target ? target.postId : null;
  const [, startTransition] = useTransition();
  const isDark = useIsDarkMode();
  const [beat, setBeat] = useState(0);
  const reactionsRef = useRef(reactions);
  reactionsRef.current = reactions;
  const liked = reactions.some((r) => r.emoji === "❤️" && r.reactedByMe);
  const heartEntry = reactions.find((r) => r.emoji === "❤️");
  const heartCount = heartEntry?.count ?? 0;
  const boostedHeartCount = heartCount + bonusLikesState;

  // Doppeltipp auf das Post-Medium: nur liken, nie zurücknehmen.
  const likeKey = "postId" in target ? target.postId : target.messageId;
  useEffect(() => {
    function onLike(e: Event) {
      if ((e as CustomEvent<{ key: string }>).detail?.key !== likeKey) return;
      const already = reactionsRef.current.some((r) => r.emoji === "❤️" && r.reactedByMe);
      setBeat((b) => b + 1);
      if (!already) handleToggle("❤️");
    }
    window.addEventListener(POST_LIKE_EVENT, onLike);
    return () => window.removeEventListener(POST_LIKE_EVENT, onLike);
    // handleToggle nutzt nur stabile Setter und das (unveränderliche) target.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [likeKey]);

  useEffect(() => {
    if (!pickerOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setPickerOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [pickerOpen]);

  function openList() {
    if (!postId) return;
    setListOpen(true);
    setReactors(null);
    getPostReactors(postId).then(setReactors);
  }

  function openCharPicker() {
    if (!postId) return;
    setCharPickerOpen(true);
    setMyLikes(null);
    getPostReactors(postId).then((list) => {
      setMyLikes(new Set(list.filter((r) => r.emoji === "❤️").map((r) => r.character.id)));
    });
  }

  // Mit einem bestimmten eigenen Charakter liken/entliken, unabhängig vom gerade aktiven.
  function toggleAsCharacter(characterId: string) {
    if (!postId || !myLikes) return;
    const already = myLikes.has(characterId);
    const nextLikes = new Set(myLikes);
    if (already) nextLikes.delete(characterId);
    else nextLikes.add(characterId);
    setMyLikes(nextLikes);
    setReactions((prev) => {
      const delta = already ? -1 : 1;
      const existing = prev.find((r) => r.emoji === "❤️");
      if (existing) {
        const nextCount = existing.count + delta;
        if (nextCount <= 0) return prev.filter((r) => r.emoji !== "❤️");
        return prev.map((r) => (r.emoji === "❤️" ? { ...r, count: nextCount } : r));
      }
      return delta > 0
        ? [
            ...prev,
            {
              emoji: "❤️",
              count: 1,
              reactedByMe: characterId === activeCharacterId,
              sampleName: myCharacters.find((c) => c.id === characterId)?.name,
            },
          ]
        : prev;
    });
    startTransition(async () => {
      await toggleReaction({ postId, characterId }, "❤️");
    });
  }

  function openBoost() {
    setBoostInput(String(bonusLikesState));
    setBoostOpen(true);
  }

  async function saveBoost() {
    if (!postId) return;
    const value = Math.max(0, Math.floor(Number(boostInput)) || 0);
    setBoostSaving(true);
    const err = await setBonusLikes(postId, value);
    setBoostSaving(false);
    if (err) {
      alert(err);
      return;
    }
    setBonusLikesState(value);
    setBoostOpen(false);
  }

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
      const sampleName = emoji === "❤️" ? myCharacters.find((c) => c.id === activeCharacterId)?.name : undefined;
      return [...prev, { emoji, count: 1, reactedByMe: true, sampleName }];
    });
    setPickerOpen(false);
    startTransition(async () => {
      await toggleReaction(target, emoji);
    });
  }

  const chips = heart ? reactions.filter((r) => r.emoji !== "❤️") : reactions;

  const pickerButton = (
    <button
      type="button"
      onClick={() => setPickerOpen(true)}
      title="Reaktion hinzufügen"
      aria-label="Reaktion hinzufügen"
      className={
        heart
          ? "flex h-7 w-7 items-center justify-center text-fg transition duration-150 hover:text-muted active:scale-75"
          : `flex h-6 w-6 items-center justify-center rounded-full transition ${
              onBubble ? "text-current opacity-80 hover:bg-current/15" : "text-muted hover:bg-surface-2 hover:text-fg"
            }`
      }
    >
      <SmilePlus className={heart ? "h-6 w-6" : "h-3.5 w-3.5"} strokeWidth={heart ? 1.75 : 2} />
    </button>
  );

  return (
    <div className={heart ? "flex flex-col gap-2" : "flex flex-wrap items-center gap-1"}>
      {heart && (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              setBeat((b) => b + 1);
              handleToggle("❤️");
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
          {myCharacters.length > 1 && (
            <button
              type="button"
              onClick={openCharPicker}
              title="Mit einem anderen Charakter liken"
              aria-label="Mit einem anderen Charakter liken"
              className="flex h-7 w-5 items-center justify-center text-muted transition hover:text-fg active:scale-90"
            >
              <ChevronDown className="h-4 w-4" strokeWidth={2} />
            </button>
          )}
          {commentSlot}
          <span className="ml-auto">{pickerButton}</span>
        </div>
      )}
      {heart && (boostedHeartCount > 0 || (total > 0 && heartCount === 0) || isOwn) && (
        <div className="flex w-fit items-center gap-1.5">
          {boostedHeartCount > 0 ? (
            <button type="button" onClick={openList} className="text-left text-sm font-semibold text-fg hover:underline">
              {heartEntry?.sampleName
                ? boostedHeartCount > 1
                  ? `${heartEntry.sampleName} und ${boostedHeartCount - 1} ${boostedHeartCount - 1 === 1 ? "anderem" : "anderen"} gefällt der Beitrag`
                  : `${heartEntry.sampleName} gefällt der Beitrag`
                : boostedHeartCount === 1
                  ? "1 Person gefällt der Beitrag"
                  : `${boostedHeartCount} Personen gefällt der Beitrag`}
            </button>
          ) : total > 0 ? (
            <button type="button" onClick={openList} className="text-left text-sm font-semibold text-fg hover:underline">
              {total === 1 ? "1 Reaktion" : `${total} Reaktionen`}
            </button>
          ) : null}
          {isOwn && (
            <button
              type="button"
              onClick={openBoost}
              title="Like-Anzahl anpassen"
              aria-label="Like-Anzahl anpassen"
              className="rounded-full p-0.5 text-muted/60 transition hover:text-fg"
            >
              <Pencil className="h-3 w-3" strokeWidth={2} />
            </button>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1">
      {chips.map((r) => (
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

      {!heart && pickerButton}

      {postId && !heart && total > 0 && (
        <button
          type="button"
          onClick={openList}
          className={`ml-1 text-xs transition hover:underline ${onBubble ? "text-current" : "text-muted hover:text-fg"}`}
        >
          {total === 1 ? "1 Reaktion" : `${total} Reaktionen`}
        </button>
      )}

      </div>

      {listOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <button
              type="button"
              onClick={() => setListOpen(false)}
              aria-label="Schließen"
              className="absolute inset-0"
            />
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
                  <li key={`${r.character.id}-${r.emoji}-${i}`}>
                    <Link
                      href={`/characters/${r.character.id}`}
                      onClick={() => setListOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-surface-2"
                    >
                      <CharacterAvatar name={r.character.name} avatarUrl={r.character.avatar_url} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-fg">{r.character.username ?? r.character.name}</p>
                        {r.character.username && <p className="truncate text-xs text-muted">{r.character.name}</p>}
                      </div>
                      <span className="text-xl">{r.emoji}</span>
                    </Link>
                  </li>
                ))}
                {bonusLikesState > 0 && (
                  <li className="px-3 py-2.5 text-sm text-muted">
                    und {bonusLikesState} {bonusLikesState === 1 ? "anderem" : "anderen"}
                  </li>
                )}
              </ul>
            </div>
          </div>,
          document.body,
        )}

      {boostOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <button type="button" onClick={() => setBoostOpen(false)} aria-label="Schließen" className="absolute inset-0" />
            <div className="relative flex w-full max-w-xs flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg text-fg">Like-Anzahl</h2>
                <button
                  type="button"
                  onClick={() => setBoostOpen(false)}
                  title="Schließen"
                  className="rounded-full p-1 text-muted transition hover:bg-surface-2 hover:text-fg"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
              <p className="text-xs text-muted">
                Zusätzliche Likes, die niemand wirklich gegeben hat – nur für die Anzeige. Kommen oben auf die echten
                Reaktionen drauf.
              </p>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={boostInput}
                onChange={(e) => setBoostInput(e.target.value)}
                className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-fg outline-none focus:border-accent"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={saveBoost}
                  disabled={boostSaving}
                  className="rounded-md bg-accent-strong px-3 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
                >
                  {boostSaving ? "Speichere..." : "Speichern"}
                </button>
                <button type="button" onClick={() => setBoostOpen(false)} className="text-sm text-muted hover:text-fg">
                  Abbrechen
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {charPickerOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <button
              type="button"
              onClick={() => setCharPickerOpen(false)}
              aria-label="Schließen"
              className="absolute inset-0"
            />
            <div className="relative flex max-h-[70vh] w-full max-w-sm flex-col rounded-2xl border border-line bg-surface shadow-xl">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <h2 className="font-serif text-lg text-fg">Als wen liken?</h2>
                <button
                  type="button"
                  onClick={() => setCharPickerOpen(false)}
                  title="Schließen"
                  className="rounded-full p-1 text-muted transition hover:bg-surface-2 hover:text-fg"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
              <ul className="overflow-y-auto p-2">
                {myLikes === null && <li className="px-3 py-4 text-sm text-muted">Lädt...</li>}
                {myLikes !== null &&
                  myCharacters.map((c) => {
                    const liked = myLikes.has(c.id);
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => toggleAsCharacter(c.id)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-surface-2 active:bg-surface-3"
                        >
                          <CharacterAvatar name={c.name} avatarUrl={c.avatar_url} size={36} />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{c.name}</span>
                          <Heart
                            className={`h-5 w-5 shrink-0 transition-colors ${liked ? "fill-[#ed4956] text-[#ed4956]" : "text-muted"}`}
                            strokeWidth={liked ? 0 : 1.75}
                          />
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </div>
          </div>,
          document.body,
        )}

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
