"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Moon } from "lucide-react";
import { CharacterAvatar } from "@/components/character-avatar";
import { useOnline } from "@/components/online-status";

export type OnlineMember = { id: string; name: string; avatarUrl: string | null; role?: "owner" | "admin" | "member" };
export type GroupMode = "status" | "role";

const ROLE_LABEL = { owner: "Besitzer:in", admin: "Admin", member: "Mitglied" } as const;
const ROLE_ORDER = ["owner", "admin", "member"] as const;
const KEY = "members:group";

// Gruppierung der Mitgliederliste (nach Online/Offline oder nach Rolle), wird im Browser gemerkt
export function useGroupMode(): [GroupMode, (m: GroupMode) => void] {
  const [mode, setMode] = useState<GroupMode>("status");
  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        if (localStorage.getItem(KEY) === "role") setMode("role");
      } catch {
        // ohne Speicher bleibt es bei der Standardansicht
      }
    });
  }, []);
  return [
    mode,
    (m) => {
      setMode(m);
      try {
        localStorage.setItem(KEY, m);
      } catch {
        // ignorieren
      }
    },
  ];
}

// Wer aus der Welt gerade online ist (ohne dich)
export function useOnlineMembers(members: OnlineMember[], selfId: string) {
  const { enabled, onlineIds } = useOnline();
  return enabled ? members.filter((m) => m.id !== selfId && onlineIds.has(m.id)) : [];
}

function Row({ m, online, selfId, open, onToggle }: { m: OnlineMember; online: boolean; selfId: string; open: boolean; onToggle: () => void }) {
  const { looks } = useOnline();
  const look = looks.get(m.id);
  const self = m.id === selfId;
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1 text-left transition hover:bg-surface-2 ${online ? "" : "opacity-55"}`}
      >
        <span className="relative shrink-0">
          <CharacterAvatar name={m.name} avatarUrl={m.avatarUrl} size={28} />
          <span
            aria-hidden
            className={`absolute -bottom-0.5 -right-0.5 box-content h-2.5 w-2.5 rounded-full border-2 border-app ${online ? "bg-emerald-500" : "bg-fg/30"}`}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-sm text-fg">
            <span className="truncate">{m.name}</span>
            {self && <span className="shrink-0 text-xs text-muted">(du)</span>}
            {look?.emoji && online && <span aria-hidden className="shrink-0 text-xs leading-none">{look.emoji}</span>}
          </span>
          {online && look?.writing ? (
            <span className="flex items-center gap-1.5 text-xs text-muted" role="status">
              <span className="flex gap-0.5">
                <span className="typing-dot" />
                <span className="typing-dot [animation-delay:150ms]" />
                <span className="typing-dot [animation-delay:300ms]" />
              </span>
              schreibt gerade
            </span>
          ) : online && look?.text ? (
            <span className="flex items-center gap-1 truncate text-xs text-muted">
              <Moon className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden />
              <span className="truncate">{look.text}</span>
            </span>
          ) : null}
        </span>
      </button>
      {open && (
        <div className="mx-2 mb-1 mt-0.5 rounded-lg border border-line bg-surface p-2.5 text-sm">
          <p className="text-xs text-muted">
            {m.role ? ROLE_LABEL[m.role] : "Mitglied"} · {online ? "online" : "offline"}
          </p>
          {self ? (
            <p className="mt-1 text-xs text-muted">Das bist du.</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Link href={`/redaktion/chat/mit/${m.id}`} className="rounded-md bg-accent-strong px-2.5 py-1 text-xs font-medium text-on-accent-strong transition hover:opacity-90">
                Nachricht senden
              </Link>
              <Link href={`/redaktion/profil/${m.id}`} className="rounded-md border border-line px-2.5 py-1 text-xs text-fg-soft transition hover:text-fg">
                Profil ansehen
              </Link>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function Group({ title, items, isOnline, selfId, openId, setOpenId }: { title: string; items: OnlineMember[]; isOnline: (m: OnlineMember) => boolean; selfId: string; openId: string | null; setOpenId: (id: string | null) => void }) {
  if (items.length === 0) return null;
  return (
    <section aria-label={title}>
      <h3 className="px-2 pb-0.5 pt-2 text-[11px] font-medium text-muted">
        {title} — {items.length}
      </h3>
      <ul className="flex flex-col gap-0.5">
        {items.map((m) => (
          <Row key={m.id} m={m} online={isOnline(m)} selfId={selfId} open={openId === m.id} onToggle={() => setOpenId(openId === m.id ? null : m.id)} />
        ))}
      </ul>
    </section>
  );
}

// Mitgliederliste wie bei Discord: gruppiert nach Online/Offline (oder Rolle), grüner bzw. grauer Punkt am Bild;
// ein Klick auf ein Mitglied klappt Rolle, Status und die Knöpfe „Nachricht senden“ / „Profil ansehen“ auf.
export function MemberList({ members, selfId, mode = "status", className = "" }: { members: OnlineMember[]; selfId: string; mode?: GroupMode; className?: string }) {
  const { enabled, onlineIds } = useOnline();
  const [openId, setOpenId] = useState<string | null>(null);
  if (!enabled) return null;
  const isOnline = (m: OnlineMember) => onlineIds.has(m.id);
  const byName = (a: OnlineMember, b: OnlineMember) => a.name.localeCompare(b.name, "de");
  const common = { isOnline, selfId, openId, setOpenId };
  return (
    <div className={className}>
      {mode === "status" ? (
        <>
          <Group title="Online" items={members.filter(isOnline).sort(byName)} {...common} />
          <Group title="Offline" items={members.filter((m) => !isOnline(m)).sort(byName)} {...common} />
        </>
      ) : (
        ROLE_ORDER.map((r) => {
          const items = members
            .filter((m) => (m.role ?? "member") === r)
            .sort((a, b) => Number(isOnline(b)) - Number(isOnline(a)) || byName(a, b));
          return <Group key={r} title={ROLE_LABEL[r]} items={items} {...common} />;
        })
      )}
    </div>
  );
}

// Umschalter Online/Offline ↔ Rolle (klein, für die Kopfzeile der Liste)
export function GroupToggle({ mode, onChange }: { mode: GroupMode; onChange: (m: GroupMode) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(mode === "status" ? "role" : "status")}
      title={mode === "status" ? "Nach Rolle gruppieren" : "Nach Online-Status gruppieren"}
      aria-label={mode === "status" ? "Nach Rolle gruppieren" : "Nach Online-Status gruppieren"}
      className="rounded-md px-1.5 py-0.5 text-[11px] text-muted transition hover:bg-surface-2 hover:text-fg"
    >
      {mode === "status" ? "Status" : "Rolle"}
    </button>
  );
}
