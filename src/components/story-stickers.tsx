"use client";

import { useEffect, useState, useTransition } from "react";
import { answerSticker, getStickerState, voteSticker } from "@/app/stories/actions";
import { STICKER_TOP, stickersOf, type StickerState, type StorySticker } from "@/lib/story-stickers";
import type { Story } from "@/lib/types";

const card = "w-[78cqw] max-w-full rounded-[3.5cqw] bg-white/95 p-[3.5cqw] text-neutral-900 shadow-lg";

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function Countdown({ sticker }: { sticker: Extract<StorySticker, { type: "countdown" }> }) {
  const now = useNow();
  const ms = new Date(sticker.endsAt).getTime() - now;
  const done = ms <= 0;
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const parts = [Math.floor((total % 86400) / 3600), Math.floor((total % 3600) / 60), total % 60].map((n) => String(n).padStart(2, "0"));
  return (
    <div className={`${card} text-center`}>
      <p className="text-[4.2cqw] font-semibold leading-tight">{sticker.title}</p>
      <p className="mt-[1.5cqw] font-mono text-[7cqw] font-bold tabular-nums leading-none">
        {done ? "Vorbei" : `${d > 0 ? `${d} T ` : ""}${parts.join(":")}`}
      </p>
    </div>
  );
}

// Anzeige der Sticker einer Story im Viewer (mit Interaktion) oder im Editor (`preview`, ohne).
export function StoryStickerLayer({
  story,
  viewerCharacterId,
  isOwner,
  preview = false,
  stickers: override,
  onFocusChange,
}: {
  story: Pick<Story, "id" | "stickers">;
  viewerCharacterId?: string;
  isOwner: boolean;
  preview?: boolean;
  stickers?: StorySticker[];
  onFocusChange?: (focused: boolean) => void;
}) {
  const stickers = override ?? stickersOf(story);
  const [state, setState] = useState<StickerState>({ votes: {}, myVotes: {}, answers: {} });
  const [answerText, setAnswerText] = useState("");
  const [showAnswers, setShowAnswers] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const hasInteractive = stickers.some((s) => s.type !== "countdown");

  useEffect(() => {
    if (preview || !hasInteractive) return;
    let cancelled = false;
    getStickerState(story.id).then((s) => {
      if (!cancelled) setState(s);
    });
    return () => {
      cancelled = true;
    };
  }, [story.id, preview, hasInteractive]);

  function refresh() {
    getStickerState(story.id).then(setState);
  }

  function vote(sticker: StorySticker, idx: number) {
    setMessage(null);
    // optimistisch anzeigen
    setState((prev) => {
      const counts = [...(prev.votes[sticker.id] ?? [0, 0, 0, 0])];
      counts[idx] += 1;
      return { ...prev, votes: { ...prev.votes, [sticker.id]: counts }, myVotes: { ...prev.myVotes, [sticker.id]: idx } };
    });
    startTransition(async () => {
      const err = await voteSticker(story.id, sticker.id, idx);
      if (err) setMessage(err);
      refresh();
    });
  }

  function answer(sticker: StorySticker) {
    const text = answerText;
    setAnswerText("");
    startTransition(async () => {
      const err = await answerSticker(story.id, sticker.id, text);
      setMessage(err ?? "Antwort gesendet");
      if (err) setAnswerText(text);
      refresh();
    });
  }

  if (stickers.length === 0) return null;
  const canAct = !preview && !!viewerCharacterId && !isOwner;

  return (
    <>
      {stickers.map((s) => (
        <div
          key={s.id}
          className="pointer-events-auto absolute left-1/2 z-20 flex w-full -translate-x-1/2 -translate-y-1/2 justify-center"
          style={{ top: `${STICKER_TOP[s.type]}%` }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {s.type === "countdown" && <Countdown sticker={s} />}

          {s.type === "poll" && (
            <div className={card}>
              <p className="mb-[2.5cqw] text-center text-[4.4cqw] font-semibold leading-tight">{s.q}</p>
              {(() => {
                const counts = state.votes[s.id] ?? [0, 0, 0, 0];
                const total = counts.reduce((a, b) => a + b, 0);
                const voted = state.myVotes[s.id] !== undefined;
                const showResults = preview ? false : voted || isOwner;
                return (
                  <div className="flex flex-col gap-[1.8cqw]">
                    {s.options.map((o, i) => {
                      const pct = total ? Math.round((counts[i] / total) * 100) : 0;
                      return showResults ? (
                        <div key={i} className="relative overflow-hidden rounded-[2cqw] bg-neutral-200 px-[3cqw] py-[2cqw] text-[3.8cqw]">
                          <span className="absolute inset-y-0 left-0 bg-neutral-900/20" style={{ width: `${pct}%` }} />
                          <span className="relative flex justify-between gap-2">
                            <span className={state.myVotes[s.id] === i ? "font-bold" : ""}>{o}</span>
                            <span>{pct} %</span>
                          </span>
                        </div>
                      ) : (
                        <button
                          key={i}
                          type="button"
                          disabled={!canAct || pending}
                          onClick={() => vote(s, i)}
                          className="rounded-[2cqw] bg-neutral-200 px-[3cqw] py-[2cqw] text-left text-[3.8cqw] transition enabled:hover:bg-neutral-300 enabled:active:scale-[0.98]"
                        >
                          {o}
                        </button>
                      );
                    })}
                    {!preview && total > 0 && <p className="text-right text-[3cqw] text-neutral-500">{total} Stimme{total === 1 ? "" : "n"}</p>}
                  </div>
                );
              })()}
            </div>
          )}

          {s.type === "question" && (
            <div className={card}>
              <p className="mb-[2.5cqw] text-center text-[4.4cqw] font-semibold leading-tight">{s.prompt}</p>
              {preview ? (
                <p className="rounded-[2cqw] bg-neutral-200 px-[3cqw] py-[2cqw] text-[3.6cqw] text-neutral-500">Antwort schreiben…</p>
              ) : isOwner ? (
                <div className="flex flex-col gap-[1.5cqw]">
                  <button type="button" onClick={() => setShowAnswers((v) => !v)} className="rounded-[2cqw] bg-neutral-200 px-[3cqw] py-[2cqw] text-[3.8cqw]">
                    {(state.answers[s.id]?.length ?? 0)} Antwort{state.answers[s.id]?.length === 1 ? "" : "en"} {showAnswers ? "ausblenden" : "ansehen"}
                  </button>
                  {showAnswers && (
                    <ul className="max-h-[30cqw] overflow-y-auto text-[3.6cqw]">
                      {(state.answers[s.id] ?? []).map((a, i) => (
                        <li key={i} className="border-t border-neutral-200 py-[1.2cqw]">
                          <span className="font-semibold">{a.name}: </span>
                          {a.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : canAct ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    answer(s);
                  }}
                  className="flex gap-[2cqw]"
                >
                  <input
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    onFocus={() => onFocusChange?.(true)}
                    onBlur={() => onFocusChange?.(false)}
                    maxLength={500}
                    placeholder="Antworten…"
                    aria-label="Antwort auf die Frage"
                    className="min-w-0 flex-1 rounded-[2cqw] bg-neutral-200 px-[3cqw] py-[2cqw] text-base text-neutral-900 outline-none placeholder:text-neutral-500"
                  />
                  <button type="submit" disabled={!answerText.trim() || pending} className="rounded-[2cqw] bg-neutral-900 px-[3.5cqw] text-[3.6cqw] font-semibold text-white disabled:opacity-40">
                    Senden
                  </button>
                </form>
              ) : null}
              {!preview && message && <p className="mt-[1.5cqw] text-center text-[3.2cqw] text-neutral-600">{message}</p>}
            </div>
          )}
        </div>
      ))}
    </>
  );
}
