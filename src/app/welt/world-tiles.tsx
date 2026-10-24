"use client";

import Link from "next/link";
import { CalendarDays, Clock, Contact, Dices, Library, MessagesSquare, Map as MapIcon, Settings, Users, UsersRound, type LucideIcon } from "lucide-react";
import { MobileOnline } from "@/components/mobile-online";
import type { OnlineMember } from "@/components/online-list";

const ICONS = { wiki: Library, charaktere: Contact, beziehungen: Users, karten: MapIcon, zeitleiste: Clock, kalender: CalendarDays, wuerfe: Dices, chat: MessagesSquare, verwalten: Settings } satisfies Record<string, LucideIcon>;

export type WorldTileDef = { id: keyof typeof ICONS; label: string; href: string };

const TILE =
  "flex min-h-24 flex-col items-start justify-between gap-3 rounded-2xl border border-line bg-surface p-3.5 text-left transition hover:border-fg/20 hover:bg-surface-2 active:scale-[.98]";

function TileInner({ Icon, label, extra }: { Icon: LucideIcon; label: string; extra?: React.ReactNode }) {
  return (
    <>
      <Icon className="h-5 w-5 text-accent" strokeWidth={1.8} aria-hidden />
      <span className="flex w-full items-center gap-2 text-[15px] font-medium text-fg">
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {extra}
      </span>
    </>
  );
}

// Kacheln der Welt-Seite; „Mitglieder“ öffnet die Liste als Bogen statt einer eigenen Seite
export function WorldTiles({ tiles, after, members, selfId }: { tiles: WorldTileDef[]; after: WorldTileDef[]; members: OnlineMember[]; selfId: string }) {
  const link = (t: WorldTileDef) => (
    <Link key={t.id} href={t.href} className={TILE}>
      <TileInner Icon={ICONS[t.id]} label={t.label} />
    </Link>
  );
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
      {tiles.map(link)}
      <MobileOnline
        members={members}
        selfId={selfId}
        trigger={(open, onlineCount) => (
          <button type="button" onClick={open} className={TILE}>
            <TileInner
              Icon={UsersRound}
              label="Mitglieder"
              extra={onlineCount > 0 ? <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">{onlineCount} online</span> : null}
            />
          </button>
        )}
      />
      {after.map(link)}
    </div>
  );
}
