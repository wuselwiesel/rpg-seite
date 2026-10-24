"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Compass, Plus, Search, Settings, Users, X } from "lucide-react";
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
  const close = () => {
    setOpenAt(null);
    setQuery("");
    setViewWorld(null);
  };
  const [query, setQuery] = useState("");
  // Welt, deren Charaktere gerade gezeigt werden (null = aktive Welt)
  const [viewWorld, setViewWorld] = useState<string | null>(null);

  // Oben die Welten als Reiter (gewählt: aktive Welt), darunter deren Charaktere alphabetisch; bei vielen Charakteren eine Suche über alle
  const shownWorldId = viewWorld && worlds.some((w) => w.id === viewWorld) ? viewWorld : activeWorld.id;
  const shownWorld = worlds.find((w) => w.id === shownWorldId) ?? activeWorld;
  const byName = (a: OwnCharacterLite, b: OwnCharacterLite) => a.name.localeCompare(b.name, "de", { sensitivity: "base" });
  const q = query.trim().toLowerCase();
  const list = (q ? characters.filter((own) => own.name.toLowerCase().includes(q)) : characters.filter((own) => own.world_id === shownWorldId)).sort(byName);
  const countIn = (worldId: string) => characters.filter((own) => own.world_id === worldId).length;
  const worldTabs = [activeWorld, ...worlds.filter((w) => w.id !== activeWorld.id)];

  const panel = (
    <div className="flex flex-col gap-2">
      <h2 className="px-1 text-sm font-medium text-muted">Du spielst</h2>
      <div role="tablist" aria-label="Welten" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
        {worldTabs.map((w) => {
          const on = !q && w.id === shownWorldId;
          return (
            <button
              key={w.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => {
                setQuery("");
                setViewWorld(w.id);
              }}
              className={`flex h-9 shrink-0 items-center gap-2 rounded-xl border pl-1 pr-3 text-sm font-medium transition ${
                on ? "border-fg/40 bg-surface-2 text-fg" : "border-line bg-surface text-fg-soft hover:bg-surface-2 hover:text-fg"
              }`}
            >
              <WorldCover name={w.name} coverUrl={w.cover_image_url} className="h-7 w-7 rounded-lg text-xs" />
              {w.name}
              {countIn(w.id) > 0 && <span className="text-xs font-normal text-muted">{countIn(w.id)}</span>}
            </button>
          );
        })}
      </div>
      {characters.length > 8 && (
        <label className="flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-muted focus-within:border-accent">
          <Search className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Charakter suchen" aria-label="Charakter suchen" className="min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-muted" />
        </label>
      )}
      {!q && shownWorldId !== activeWorld.id && (
        <button
          type="button"
          disabled={busy}
          onClick={() => startWorld(() => setActiveWorld(shownWorldId))}
          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-accent-strong px-3 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-60"
        >
          Zu {shownWorld.name} wechseln
        </button>
      )}
      <div className="flex flex-col gap-0.5">
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
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium text-fg">{own.name}</span>
                  {q && <span className="block truncate text-xs text-muted">{own.world_name}</span>}
                </span>
              </button>
              {active && c && <PresenceControl characterId={c.id} online={!!c.presence_online} />}
              <Link href={profileHref(own)} onClick={close} className="shrink-0 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg transition hover:bg-surface-2">
                Profil
              </Link>
            </div>
          );
        })}
        {list.length === 0 && <p className="px-2 py-3 text-sm text-muted">{q ? "Kein Charakter gefunden." : `Noch kein Charakter in ${shownWorld.name}.`}</p>}
      </div>
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
      <div className="flex flex-wrap gap-x-1 border-t border-line pt-1.5">
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
          data-world-id={activeWorld.id}
          data-character-id={c?.id}
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
          data-world-id={activeWorld.id}
          data-character-id={c?.id}
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
