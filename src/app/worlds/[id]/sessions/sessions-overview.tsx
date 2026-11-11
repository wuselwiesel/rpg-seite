"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import { averageStars, durationLabel, type SceneSession } from "@/lib/scene-session";
import { SessionDialog, Stars } from "@/app/story/[id]/scene-sessions";

// participant: gehört zu den Mitspielenden der Szene (darf bewerten und posten); isPrivate: geheime Szene (kein Posten)
export type OverviewSession = { session: SceneSession; sceneId: string; sceneTitle: string; participant: boolean; isPrivate: boolean };

type Sort = "neu" | "bewertung";

export function SessionsOverview({ sessions, selfId }: { sessions: OverviewSession[]; selfId: string }) {
  const [sceneId, setSceneId] = useState("");
  const [sort, setSort] = useState<Sort>("neu");
  const [openId, setOpenId] = useState<string | null>(null);

  const scenes = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of sessions) if (!seen.has(s.sceneId)) seen.set(s.sceneId, s.sceneTitle);
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1], "de"));
  }, [sessions]);

  const visible = useMemo(() => {
    const list = sessions.filter((s) => !sceneId || s.sceneId === sceneId);
    if (sort === "bewertung") {
      return [...list].sort((a, b) => (averageStars(b.session.ratings) ?? -1) - (averageStars(a.session.ratings) ?? -1) || b.session.endedAt.localeCompare(a.session.endedAt));
    }
    return list;
  }, [sessions, sceneId, sort]);

  const allRatings = visible.flatMap((s) => s.session.ratings);
  const overallAvg = averageStars(allRatings);
  const open = sessions.find((s) => s.session.id === openId) ?? null;

  if (sessions.length === 0) {
    return <p className="text-sm text-muted">Noch keine Session beendet. In einer Szene gibt es dafür den Knopf „Session beenden“.</p>;
  }

  const select = "rounded-md border border-line bg-surface px-2 py-1.5 text-base text-fg outline-none focus:border-accent sm:text-sm";
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-surface-2 px-3 py-2">
          <dd className="text-base font-medium text-fg">{visible.length}</dd>
          <dt className="text-xs text-muted">{visible.length === 1 ? "Session" : "Sessions"}</dt>
        </div>
        <div className="rounded-xl bg-surface-2 px-3 py-2">
          <dd className="text-base font-medium text-fg">{overallAvg !== null ? `Ø ${overallAvg.toLocaleString("de-DE", { maximumFractionDigits: 1 })}` : "–"}</dd>
          <dt className="text-xs text-muted">Sterne</dt>
        </div>
        <div className="rounded-xl bg-surface-2 px-3 py-2">
          <dd className="text-base font-medium text-fg">{visible.reduce((n, s) => n + s.session.stats.messages, 0).toLocaleString("de-DE")}</dd>
          <dt className="text-xs text-muted">Nachrichten</dt>
        </div>
      </dl>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-fg-soft">
          Szene
          <select value={sceneId} onChange={(e) => setSceneId(e.target.value)} className={`${select} max-w-[14rem]`}>
            <option value="">Alle</option>
            {scenes.map(([id, title]) => (
              <option key={id} value={id}>
                {title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-fg-soft">
          Sortiert nach
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={select}>
            <option value="neu">Neueste zuerst</option>
            <option value="bewertung">Beste Bewertung</option>
          </select>
        </label>
      </div>

      <ul className="flex flex-col gap-3">
        {visible.map(({ session, sceneId: sid, sceneTitle, participant }) => {
          const avg = averageStars(session.ratings);
          const mine = session.ratings.find((r) => r.userId === selfId);
          return (
            <li key={session.id} className="rounded-xl border border-line bg-surface p-4">
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <Link href={`/story/${sid}`} className="min-w-0 truncate font-medium text-fg transition hover:text-accent">
                  {sceneTitle}
                </Link>
                <span className="shrink-0 text-xs text-muted">{formatDateTime(session.endedAt)}</span>
              </div>
              <p className="text-sm text-fg-soft">
                {session.stats.messages} {session.stats.messages === 1 ? "Nachricht" : "Nachrichten"}
                {" · "}
                {session.stats.words.toLocaleString("de-DE")} Wörter
                {" · "}
                {durationLabel(session.stats.first_at, session.stats.last_at)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                {avg !== null ? (
                  <span className="inline-flex items-center gap-1.5 text-sm text-fg">
                    <Stars value={avg} />
                    <span className="text-xs text-muted">
                      Ø {avg.toLocaleString("de-DE", { maximumFractionDigits: 1 })} ({session.ratings.length})
                    </span>
                  </span>
                ) : (
                  <span className="text-xs text-muted">noch keine Bewertung</span>
                )}
                {participant && !mine && <span className="rounded-full bg-accent-strong/15 px-2 py-0.5 text-xs text-accent">von dir noch nicht bewertet</span>}
                <button type="button" onClick={() => setOpenId(session.id)} className="ml-auto text-sm font-medium text-accent hover:underline">
                  Ansehen
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {open && (
        <SessionDialog
          key={open.session.id}
          session={open.session}
          storyPostId={open.sceneId}
          selfId={selfId}
          canRate={open.participant}
          canPost={open.participant && !open.isPrivate}
          onClose={() => setOpenId(null)}
          scene={{ title: open.sceneTitle, href: `/story/${open.sceneId}?sitzung=${open.session.id}` }}
        />
      )}
    </div>
  );
}
