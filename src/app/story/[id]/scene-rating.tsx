"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { averageStars, SESSION_TEXT_MAX, type SessionRating } from "@/lib/scene-session";
import { saveSceneRating } from "../session-actions";
import { Stars } from "./scene-sessions";

// Bewertung der ganzen Szene, sobald sie abgeschlossen ist: Mitspielende vergeben einmal Sterne und eine kurze Rückmeldung,
// alle, die die Szene sehen, sehen Durchschnitt und Rückmeldungen.
export function SceneRating({ storyPostId, ratings, selfId, canRate }: { storyPostId: string; ratings: SessionRating[]; selfId: string; canRate: boolean }) {
  const mine = ratings.find((r) => r.userId === selfId) ?? null;
  const [stars, setStars] = useState(0);
  const [liked, setLiked] = useState("");
  const [disliked, setDisliked] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const avg = averageStars(ratings);
  const sorted = [...ratings].sort((a, b) => (a.userId === selfId ? -1 : b.userId === selfId ? 1 : 0));
  if (!canRate && ratings.length === 0) return null;

  function save() {
    setMessage(null);
    startTransition(async () => {
      const err = await saveSceneRating(storyPostId, { stars, liked, disliked });
      setMessage(err ? { ok: false, text: err } : { ok: true, text: "Bewertung gespeichert." });
    });
  }

  const field = "w-full resize-none rounded-md border border-line bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent sm:text-sm";
  return (
    <section aria-label="Bewertung der Szene" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold text-fg">Bewertung der Szene</h2>
        {avg !== null ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted">
            <Stars value={avg} size="h-3.5 w-3.5" />
            Ø {avg.toLocaleString("de-DE", { maximumFractionDigits: 1 })} ({ratings.length})
          </span>
        ) : (
          <span className="text-xs text-muted">Noch keine Bewertung</span>
        )}
      </div>

      {canRate && !mine && (
        <div className="flex flex-col gap-3 rounded-xl bg-surface-2 p-3">
          <p className="text-sm font-medium text-fg">Wie fandest du die ganze Szene?</p>
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Sterne">
            {[1, 2, 3, 4, 5].map((i) => (
              <button key={i} type="button" role="radio" aria-checked={stars === i} aria-label={i === 1 ? "1 Stern" : `${i} Sterne`} onClick={() => setStars(i)} className="rounded p-1 transition active:scale-90">
                <Star className={`h-7 w-7 ${i <= stars ? "fill-accent text-accent" : "text-line"}`} strokeWidth={1.75} />
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1 text-sm text-fg">
            Was hat besonders gut gefallen?
            <textarea value={liked} onChange={(e) => setLiked(e.target.value)} maxLength={SESSION_TEXT_MAX} rows={2} className={field} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-fg">
            Was hat weniger gefallen?
            <textarea value={disliked} onChange={(e) => setDisliked(e.target.value)} maxLength={SESSION_TEXT_MAX} rows={2} className={field} />
          </label>
          <div className="flex items-center gap-3">
            <button type="button" onClick={save} disabled={pending || stars === 0} className="rounded-md bg-accent-strong px-4 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50">
              {pending ? "Speichere..." : "Bewertung speichern"}
            </button>
            {message && (
              <p role="status" className={`text-xs ${message.ok ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {message.text}
              </p>
            )}
          </div>
        </div>
      )}

      {sorted.length > 0 && (
        <ul className="flex flex-col gap-2">
          {sorted.map((r) => (
            <li key={r.userId} className="flex flex-col gap-1.5 rounded-xl bg-surface-2 px-3 py-2.5 text-sm">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium text-fg">
                  {r.accountName ?? "Jemand"}
                  {r.userId === selfId ? " (du)" : ""}
                </span>
                <Stars value={r.stars} size="h-3.5 w-3.5" />
                <span className="text-xs text-muted">
                  {r.stars} {r.stars === 1 ? "Stern" : "Sterne"}
                </span>
              </div>
              {r.liked && (
                <p className="text-fg-soft">
                  <span className="font-medium">Gefiel: </span>
                  {r.liked}
                </p>
              )}
              {r.disliked && (
                <p className="text-fg-soft">
                  <span className="font-medium">Weniger: </span>
                  {r.disliked}
                </p>
              )}
              {!r.liked && !r.disliked && <p className="text-xs text-muted">Kein Kommentar.</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
