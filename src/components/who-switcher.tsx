"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Compass, Plus, Settings, Users, X } from "lucide-react";
import { setActiveWorld } from "@/app/worlds/actions";
import { useSwitchCharacter, WHO_OPEN_EVENT } from "@/lib/use-switch-character";
import type { OwnCharacterLite } from "@/lib/active-character";
import { shortName } from "@/lib/nav-model";
import { CharacterAvatar } from "./character-avatar";
import { PresenceControl } from "./character-presence";
import { WorldCover } from "./world-cover";
import type { Character, World } from "@/lib/types";

type Props = {
  variant: "mobile" | "sidebar";
  worlds: World[];
  activeWorld: World;
  canManage: boolean;
  activeCharacter: Character | null;
  characters: OwnCharacterLite[];
};

// „Wer und wo“: aktiver Charakter mit Welt-Abzeichen; ein Tipp öffnet „Du spielst“ (Charakter wechseln, Profil, Welten).
// Handy: Bogen von unten; Computer: Popover unter der Karte in der Seitenleiste.
export function WhoSwitcher({ variant, worlds, activeWorld, canManage, activeCharacter, characters }: Props) {
  const [openAt, setOpenAt] = useState<string | null>(null);
  const pathname = usePathname();
  // Wechselt die Seite (z. B. über „Profil“), ist der Bogen zu
  const open = openAt !== null && openAt === pathname;
  const setOpen = (v: boolean) => setOpenAt(v ? pathname : null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const { switchTo, profileHref, pending } = useSwitchCharacter(characters, activeWorld.id);
  const [worldPending, startWorld] = useTransition();
  const busy = pending || worldPending;

  // Andere Stellen (Charakter-Tab, Chip im Chat) öffnen den Bogen per Event; nur die sichtbare Ausgabe reagiert
  useEffect(() => {
    const onOpen = () => {
      if (buttonRef.current?.offsetParent) setOpenAt(pathname);
    };
    window.addEventListener(WHO_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(WHO_OPEN_EVENT, onOpen);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenAt(null);
    const onDown = (e: PointerEvent) => {
      if (variant !== "sidebar") return;
      const t = e.target as Node;
      if (!boxRef.current?.contains(t) && !buttonRef.current?.contains(t)) setOpenAt(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, variant]);

  const c = activeCharacter;
  const badge = <WorldCover name={activeWorld.name} coverUrl={activeWorld.cover_image_url} className="absolute -bottom-1 -right-1 h-4 w-4 rounded-[5px] text-[9px] ring-2 ring-app" />;
  const close = () => setOpenAt(null);

  // Nach Welt gruppiert, die aktive Welt zuerst
  const groups = [activeWorld, ...worlds.filter((w) => w.id !== activeWorld.id)]
    .map((w) => ({ world: w, list: characters.filter((own) => own.world_id === w.id) }))
    .filter((g) => g.list.length > 0);

  const panel = (
    <div className="flex flex-col gap-1">
      <h2 className="px-1 pb-1 text-sm font-medium text-muted">Du spielst</h2>
      {groups.map(({ world: w, list }) => (
        <section key={w.id} aria-label={w.name} className="flex flex-col gap-0.5">
          {groups.length > 1 && <h3 className="mt-1 px-1.5 font-serif text-[15px] text-muted">{w.name}</h3>}
          {list.map((own) => {
            const active = own.id === c?.id;
            return (
              <div key={own.id} className={`flex items-center gap-1 rounded-2xl pr-1.5 ${active ? "bg-surface-2" : ""}`}>
                <button
                  type="button"
                  disabled={busy}
                  aria-pressed={active}
                  onClick={() => (active ? close() : switchTo(own, close))}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-1.5 py-1.5 text-left transition hover:bg-surface-2 disabled:opacity-60"
                >
                  <span className={`shrink-0 rounded-full p-0.5 ring-2 ${active ? "ring-fg" : "ring-transparent"}`}>
                    <CharacterAvatar name={own.name} avatarUrl={own.avatar_url} size={36} />
                  </span>
                  <span className="min-w-0 truncate text-[15px] font-medium text-fg">{own.name}</span>
                </button>
                {active && c && <PresenceControl characterId={c.id} online={!!c.presence_online} />}
                <Link href={profileHref(own)} onClick={close} className="shrink-0 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg transition hover:bg-surface-2">
                  Profil
                </Link>
              </div>
            );
          })}
        </section>
      ))}
      <div className="flex gap-1">
        <Link href="/characters/new" onClick={close} className="flex flex-1 items-center gap-2 rounded-xl px-2 py-2 text-sm text-fg-soft transition hover:bg-surface-2 hover:text-fg">
          <Plus className="h-4 w-4 shrink-0" strokeWidth={2} />
          Neuer Charakter
        </Link>
        <Link href="/characters" onClick={close} className="flex flex-1 items-center gap-2 rounded-xl px-2 py-2 text-sm text-fg-soft transition hover:bg-surface-2 hover:text-fg">
          <Users className="h-4 w-4 shrink-0" strokeWidth={2} />
          Meine Charaktere
        </Link>
      </div>
      <div className="my-1.5 h-px bg-line" />
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Welt wechseln">
        {worlds.map((w) => {
          const active = w.id === activeWorld.id;
          return (
            <button
              key={w.id}
              type="button"
              disabled={busy}
              aria-pressed={active}
              onClick={() => (active ? close() : startWorld(() => setActiveWorld(w.id)))}
              className={`flex h-9 items-center gap-2 rounded-xl border pl-1 pr-3 text-sm font-medium transition disabled:opacity-60 ${
                active ? "border-fg/40 bg-surface-2 text-fg" : "border-line bg-surface text-fg-soft hover:bg-surface-2 hover:text-fg"
              }`}
            >
              <WorldCover name={w.name} coverUrl={w.cover_image_url} className="h-7 w-7 rounded-lg text-xs" />
              {w.name}
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-1">
        {canManage && (
          <Link href={`/worlds/${activeWorld.id}`} onClick={close} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted transition hover:bg-surface-2 hover:text-fg">
            <Settings className="h-3.5 w-3.5" strokeWidth={2} />
            Diese Welt bearbeiten
          </Link>
        )}
        <Link href="/worlds" onClick={close} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted transition hover:bg-surface-2 hover:text-fg">
          <Settings className="h-3.5 w-3.5" strokeWidth={2} />
          Welten verwalten
        </Link>
        <Link href="/search?tab=worlds" onClick={close} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted transition hover:bg-surface-2 hover:text-fg">
          <Compass className="h-3.5 w-3.5" strokeWidth={2} />
          Welten entdecken
        </Link>
        <Link href="/worlds/new" onClick={close} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted transition hover:bg-surface-2 hover:text-fg">
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          Neue Welt erschaffen
        </Link>
      </div>
    </div>
  );

  const label = c ? `${c.name} in ${activeWorld.name}. Charakter und Welt wechseln` : `Welt: ${activeWorld.name}. Wechseln`;

  if (variant === "sidebar") {
    return (
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={label}
          data-tour="world"
          className="flex w-full items-center gap-3 rounded-xl px-1 py-1 text-left transition hover:bg-surface-3"
        >
          <span className="relative shrink-0">
            {c ? <CharacterAvatar name={c.name} avatarUrl={c.avatar_url} size={40} /> : <WorldCover name={activeWorld.name} coverUrl={activeWorld.cover_image_url} className="h-10 w-10 rounded-lg text-sm" />}
            {c && badge}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-medium leading-tight text-fg">{c ? c.name : activeWorld.name}</span>
            <span className="block truncate font-serif text-[15px] leading-tight text-muted">{c ? activeWorld.name : "Charakter anlegen"}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} aria-hidden />
        </button>
        {open && (
          <div ref={boxRef} className="menu-pop absolute left-0 top-full z-50 mt-2 max-h-[75vh] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-line bg-surface p-3 shadow-lg">
            {panel}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-label={label}
        data-tour="world"
        className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full py-1 pl-0.5 pr-2 text-left transition active:bg-surface-2"
      >
        <span className="relative shrink-0">
          {c ? <CharacterAvatar name={c.name} avatarUrl={c.avatar_url} size={34} /> : <WorldCover name={activeWorld.name} coverUrl={activeWorld.cover_image_url} className="h-8 w-8 rounded-lg text-xs" />}
          {c && badge}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-0.5 text-sm font-medium leading-tight text-fg">
            <span className="truncate">{c ? shortName(c.name) : activeWorld.name}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0" strokeWidth={2.4} aria-hidden />
          </span>
          <span className="block truncate font-serif text-[15px] leading-tight text-muted">{c ? activeWorld.name : "Charakter anlegen"}</span>
        </span>
      </button>
      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[60] bg-black/40" onClick={close} aria-hidden />
            <div
              role="dialog"
              aria-label="Du spielst"
              className="fixed inset-x-0 bottom-0 z-[70] max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t border-line bg-surface p-4 shadow-lg"
              style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
            >
              <button type="button" onClick={close} aria-label="Schließen" className="absolute right-3 top-3 rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg">
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
              {panel}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
