"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { ClipboardCheck, Star, X } from "lucide-react";
import { useConfirm } from "@/components/confirm-dialog";
import { formatDateTime } from "@/lib/format";
import { averageStars, durationLabel, SESSION_TEXT_MAX, type SceneSession } from "@/lib/scene-session";
import { useRouter } from "next/navigation";
import { endSceneSession, postSessionToRedaktion, saveSessionRating, setSessionStart } from "../session-actions";
import { highlightEntries } from "@/lib/scene-quote";

const fmt = (n: number) => n.toLocaleString("de-DE");

export function Stars({ value, size = "h-4 w-4" }: { value: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} von 5 Sternen`} role="img">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${size} ${i <= Math.round(value) ? "fill-accent text-accent" : "text-line"}`} strokeWidth={1.75} />
      ))}
    </span>
  );
}

// „Session beenden“ in der Szene: beendet nichts an der Szene selbst, zeigt einen Rückblick (Statistik) und lädt zum Bewerten ein.
// Frühere Sessions bleiben als Liste erhalten; wer noch nicht bewertet hat, wird oben darauf hingewiesen.
export function SceneSessions({
  storyPostId,
  sessions,
  selfId,
  canParticipate,
  openSessionId,
  privateScene,
  pendingStart,
}: {
  storyPostId: string;
  sessions: SceneSession[];
  selfId: string;
  canParticipate: boolean;
  openSessionId: string | null;
  // Geheime Szenen lassen sich nicht in der Redaktion posten
  privateScene: boolean;
  // Von Hand gewählter Anfang der nächsten Session (Nachricht), falls gesetzt
  pendingStart: { entryId: string | null; at: string } | null;
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(openSessionId && sessions.some((s) => s.id === openSessionId) ? openSessionId : null);
  const [listOpen, setListOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  const open = sessions.find((s) => s.id === openId) ?? null;
  // Noch nicht von mir bewertet und höchstens zwei Wochen alt
  const [now] = useState(() => Date.now());
  const toRate = canParticipate
    ? sessions.find((s) => !s.ratings.some((r) => r.userId === selfId) && now - new Date(s.endedAt).getTime() < 14 * 86400000)
    : undefined;

  async function end() {
    setError(null);
    const ok = await confirm({
      message: pendingStart
        ? `Session beenden? Sie umfasst alles ab dem von dir gewählten Anfang (${formatDateTime(pendingStart.at)}). Die Szene bleibt, wie sie ist. Du siehst einen Rückblick und kannst die Session bewerten; die anderen Mitspielenden bekommen eine Meldung und können sie auch bewerten.`
        : "Session beenden? Sie umfasst alles seit dem Ende der letzten Session (oder seit Szenenbeginn). Die Szene bleibt, wie sie ist. Du siehst einen Rückblick und kannst die Session bewerten; die anderen Mitspielenden bekommen eine Meldung und können sie auch bewerten.",
      confirmLabel: "Session beenden",
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await endSceneSession(storyPostId);
      if (res.ok) setOpenId(res.sessionId);
      else setError(res.message);
    });
  }

  if (!canParticipate && sessions.length === 0) return null;

  return (
    <div className="mb-4 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        {canParticipate && (
          <button
            type="button"
            onClick={end}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-medium text-fg-soft transition hover:bg-surface-3 hover:text-fg disabled:opacity-50"
          >
            <ClipboardCheck className="h-3.5 w-3.5" strokeWidth={2} />
            {pending ? "Einen Moment..." : "Session beenden"}
          </button>
        )}
        {sessions.length > 0 && (
          <button type="button" onClick={() => setListOpen((v) => !v)} aria-expanded={listOpen} className="text-xs text-muted transition hover:text-fg">
            {sessions.length === 1 ? "1 beendete Session" : `${sessions.length} beendete Sessions`}
          </button>
        )}
        {error && (
          <p role="status" className="text-xs text-muted">
            {error}
          </p>
        )}
      </div>

      {pendingStart && canParticipate && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-surface-2 px-4 py-2.5 text-sm">
          <p className="text-fg-soft">
            Die nächste Session beginnt bei der Nachricht vom <span className="text-fg">{formatDateTime(pendingStart.at)}</span>.
          </p>
          <span className="ml-auto flex items-center gap-3">
            {pendingStart.entryId && (
              <button type="button" onClick={() => highlightEntries([pendingStart.entryId!])} className="text-xs font-medium text-accent hover:underline">
                Anzeigen
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                startTransition(async () => {
                  const err = await setSessionStart(storyPostId, null);
                  if (err) setError(err);
                  else router.refresh();
                })
              }
              className="text-xs text-muted transition hover:text-fg"
            >
              Zurücksetzen
            </button>
          </span>
        </div>
      )}

      {toRate && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-accent-strong/15 px-4 py-2.5 text-sm">
          <Star className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} />
          <p className="text-fg">Die Session vom {formatDateTime(toRate.endedAt)} ist beendet. Wie lief sie?</p>
          <button
            type="button"
            onClick={() => setOpenId(toRate.id)}
            className="ml-auto rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-fg transition hover:bg-surface-2"
          >
            Jetzt bewerten
          </button>
        </div>
      )}

      {listOpen && (
        <ul className="flex flex-col divide-y divide-line rounded-xl bg-surface-2 px-3">
          {sessions.map((s) => {
            const avg = averageStars(s.ratings);
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                <span className="text-fg">{formatDateTime(s.endedAt)}</span>
                <span className="text-xs text-muted">{s.stats.messages} Nachrichten</span>
                {avg !== null ? <Stars value={avg} size="h-3.5 w-3.5" /> : <span className="text-xs text-muted">noch keine Bewertung</span>}
                <button type="button" onClick={() => setOpenId(s.id)} className="ml-auto text-xs font-medium text-accent hover:underline">
                  Ansehen
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {open && <SessionDialog key={open.id} session={open} storyPostId={storyPostId} selfId={selfId} canRate={canParticipate} canPost={canParticipate && !privateScene} onClose={() => setOpenId(null)} />}
      {dialog}
    </div>
  );
}

// `scene`: Rückblick außerhalb der Szene (Übersicht): zeigt den Szenentitel mit Link; bewertet wird dann in der Szene
export function SessionDialog({
  session,
  storyPostId,
  selfId,
  canRate,
  canPost,
  onClose,
  scene,
}: {
  session: SceneSession;
  storyPostId: string;
  selfId: string;
  canRate: boolean;
  // Von Hand in der Redaktion posten: Mitspielende, nicht bei geheimen Szenen
  canPost: boolean;
  onClose: () => void;
  scene?: { title: string; href: string };
}) {
  const mine = session.ratings.find((r) => r.userId === selfId) ?? null;
  const [stars, setStars] = useState(mine?.stars ?? 0);
  const [liked, setLiked] = useState(mine?.liked ?? "");
  const [disliked, setDisliked] = useState(mine?.disliked ?? "");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [postId, setPostId] = useState<string | null>(session.redaktionPostId);
  const [posting, startPosting] = useTransition();
  const [postError, setPostError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Portal erst nach dem Einhängen im Browser
    setMounted(true);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const st = session.stats;
  const max = Math.max(1, ...st.characters.map((c) => c.count));
  const avg = averageStars(session.ratings);
  // Beim Bewerten steht die eigene Bewertung im Formular; im Nur-Lesen-Fenster (Übersicht) gehört sie in die Liste
  const others = canRate ? session.ratings.filter((r) => r.userId !== selfId) : session.ratings;

  function save() {
    setMessage(null);
    startTransition(async () => {
      const err = await saveSessionRating(session.id, { stars, liked, disliked });
      setMessage(err ? { ok: false, text: err } : { ok: true, text: "Bewertung gespeichert." });
    });
  }

  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <button type="button" onClick={onClose} aria-label="Schließen" className="absolute inset-0" />
      <div role="dialog" aria-label="Rückblick auf die Session" className="relative flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-3xl border border-line bg-surface shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-serif text-xl text-fg">Rückblick auf die Session</h2>
            {scene && (
              <p className="truncate text-sm">
                <Link href={scene.href} className="text-accent hover:underline">
                  {scene.title}
                </Link>
              </p>
            )}
            <p className="text-xs text-muted">
              ab {formatDateTime(session.startedAt)} · beendet am {formatDateTime(session.endedAt)}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Schließen" className="rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-fg">
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto px-5 py-4">
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Nachrichten", fmt(st.messages)],
              ["Wörter", fmt(st.words)],
              ["Zeitraum", durationLabel(st.first_at, st.last_at)],
              ["Würfe", fmt(st.rolls)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-surface-2 px-3 py-2">
                <dd className="text-base font-medium text-fg">{value}</dd>
                <dt className="text-xs text-muted">{label}</dt>
              </div>
            ))}
          </dl>

          {st.characters.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium text-fg">Wer wie viel geschrieben hat</p>
              <ul className="flex flex-col gap-1.5">
                {st.characters.map((c) => (
                  <li key={c.id ?? "narrator"} className="flex items-center gap-3 text-sm">
                    <span className="w-28 shrink-0 truncate text-fg-soft sm:w-36">{c.name}</span>
                    <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.max(6, (c.count / max) * 100)}%` }} />
                    </span>
                    <span className="w-8 shrink-0 text-right text-xs text-muted">{c.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {canRate && (
            <div className="flex flex-col gap-3 rounded-xl border border-line p-3">
              <p className="text-sm font-medium text-fg">{mine ? "Deine Bewertung" : "Wie lief die Session?"}</p>
              <div className="flex items-center gap-1" role="radiogroup" aria-label="Sterne">
                {[1, 2, 3, 4, 5].map((i) => (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={stars === i}
                    aria-label={i === 1 ? "1 Stern" : `${i} Sterne`}
                    onClick={() => setStars(i)}
                    className="rounded p-1 transition active:scale-90"
                  >
                    <Star className={`h-7 w-7 ${i <= stars ? "fill-accent text-accent" : "text-line"}`} strokeWidth={1.75} />
                  </button>
                ))}
              </div>
              <label className="flex flex-col gap-1 text-sm text-fg">
                Was hat besonders gut gefallen?
                <textarea
                  value={liked}
                  onChange={(e) => setLiked(e.target.value)}
                  maxLength={SESSION_TEXT_MAX}
                  rows={2}
                  className="w-full resize-none rounded-md border border-line bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent sm:text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-fg">
                Was hat weniger gefallen?
                <textarea
                  value={disliked}
                  onChange={(e) => setDisliked(e.target.value)}
                  maxLength={SESSION_TEXT_MAX}
                  rows={2}
                  className="w-full resize-none rounded-md border border-line bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent sm:text-sm"
                />
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={save}
                  disabled={pending || stars === 0}
                  className="rounded-md bg-accent-strong px-4 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
                >
                  {pending ? "Speichere..." : mine ? "Bewertung ändern" : "Bewertung speichern"}
                </button>
                {message && (
                  <p role="status" className={`text-xs ${message.ok ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {message.text}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-fg">{canRate ? "Bewertungen der anderen" : "Bewertungen"}</p>
              {avg !== null && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                  <Stars value={avg} size="h-3.5 w-3.5" />
                  Ø {avg.toLocaleString("de-DE", { maximumFractionDigits: 1 })} ({session.ratings.length})
                </span>
              )}
            </div>
            {others.length === 0 ? (
              <p className="text-sm text-muted">{canRate ? "Noch keine Bewertung der anderen." : "Noch keine Bewertung."}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {others.map((r) => (
                  <li key={r.userId} className="flex flex-col gap-1 rounded-xl bg-surface-2 px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-fg">{r.characterName ?? "Jemand"}{r.userId === selfId ? " (du)" : ""}</span>
                      <Stars value={r.stars} size="h-3.5 w-3.5" />
                    </div>
                    {r.liked && (
                      <p className="text-fg-soft">
                        <span className="text-muted">Gefiel: </span>
                        {r.liked}
                      </p>
                    )}
                    {r.disliked && (
                      <p className="text-fg-soft">
                        <span className="text-muted">Weniger: </span>
                        {r.disliked}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-line pt-4">
            <p className="text-sm font-medium text-fg">In der Redaktion</p>
            {postId ? (
              <p className="text-sm text-fg-soft">
                Der Rückblick steht in der Redaktion.{" "}
                <Link href={`/redaktion/${postId}`} className="text-accent hover:underline">
                  Zum Beitrag
                </Link>
              </p>
            ) : canPost ? (
              <>
                <p className="text-xs text-muted">
                  Gepostet werden Szenentitel, Zahlen und der Sterne-Durchschnitt, ohne die Bewertungstexte. Der Beitrag erscheint in deinem Namen.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={posting}
                    onClick={() =>
                      startPosting(async () => {
                        setPostError(null);
                        const res = await postSessionToRedaktion(session.id, storyPostId);
                        if (res.ok) setPostId(res.postId);
                        else setPostError(res.message);
                      })
                    }
                    className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-fg transition hover:bg-surface-2 disabled:opacity-50"
                  >
                    {posting ? "Poste..." : "In der Redaktion posten"}
                  </button>
                  {postError && (
                    <p role="status" className="text-xs text-red-600 dark:text-red-400">
                      {postError}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted">Nicht in der Redaktion gepostet.</p>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
