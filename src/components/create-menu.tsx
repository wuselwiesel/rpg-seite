"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, CircleDashed, ImagePlus, Inbox, Library, NotebookPen, PenLine, Plus, UserPlus, X, type LucideIcon } from "lucide-react";
import { setActiveCharacter } from "@/app/characters/actions";
import { createNote } from "@/app/notizen/actions";
import { useAppMode } from "./mode-context";
import { useWorldRights } from "./rights-context";
import { useNotebook } from "./notebook-host";
import { CharacterAvatar } from "./character-avatar";
import { shortName } from "@/lib/nav-model";
import type { Character } from "@/lib/types";

type Item = { label: string; Icon: LucideIcon; href?: string; note?: true };

// Ein „+ Erstellen“ für alles (Variante D): Handy als Bogen aus der Mitte der unteren Leiste, Computer als Popover in der Seitenleiste.
// Im Spiel wählt man oben, als welcher Charakter (der aktiven Welt) man erstellt.
export function CreateMenu({ variant, characters, activeId }: { variant: "mobile" | "sidebar"; characters: Character[]; activeId: string | null }) {
  const mode = useAppMode();
  const rights = useWorldRights();
  const notebook = useNotebook();
  const router = useRouter();
  const pathname = usePathname();
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt !== null && openAt === pathname;
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const close = () => setOpenAt(null);

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

  const inRed = mode === "redaktion";
  const items: Item[] = inRed
    ? [
        { label: "Beitrag", Icon: PenLine, href: "/redaktion/new" },
        { label: "Feedback", Icon: Inbox, href: "/redaktion/tickets/new" },
        { label: "Notiz", Icon: NotebookPen, note: true },
        { label: "Neuer Charakter", Icon: UserPlus, href: "/characters/new" },
      ]
    : [
        { label: "Beitrag", Icon: ImagePlus, href: "/posts/new" },
        { label: "Story (24 h)", Icon: CircleDashed, href: "/stories/new" },
        ...(rights.storyCreate ? [{ label: "Szene", Icon: BookOpen, href: "/story/new" }] : []),
        ...(rights.wikiCreate ? [{ label: "Wiki-Seite", Icon: Library, href: "/wiki/new" }] : []),
        { label: "Notiz", Icon: NotebookPen, note: true as const },
        { label: "Neuer Charakter", Icon: UserPlus, href: "/characters/new" },
      ];

  function newNote() {
    setError(null);
    start(async () => {
      const r = await createNote({});
      if (r.error || !r.id) return setError(r.error ?? "Konnte nicht angelegt werden.");
      close();
      notebook.open({ noteId: r.id });
    });
  }

  function pickCharacter(id: string) {
    if (id === activeId) return;
    start(async () => {
      await setActiveCharacter(id);
      router.refresh();
    });
  }

  const tile = "flex h-14 items-center gap-2.5 rounded-2xl border border-line bg-surface px-3 text-left text-sm font-medium leading-tight text-fg transition hover:bg-surface-2 disabled:opacity-60";
  const panel = (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted">Erstellen</h2>
      {!inRed && characters.length > 1 && (
        <div role="group" aria-label="Erstellen als" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]">
          {characters.map((c) => {
            const on = c.id === activeId;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                disabled={pending}
                onClick={() => pickCharacter(c.id)}
                className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-3 text-xs font-medium transition disabled:opacity-60 ${
                  on ? "border-fg/40 bg-surface-2 text-fg" : "border-line bg-surface text-fg-soft hover:bg-surface-2"
                }`}
              >
                <CharacterAvatar name={c.name} avatarUrl={c.avatar_url} size={28} />
                {shortName(c.name)}
              </button>
            );
          })}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {items.map(({ label, Icon, href, note }) =>
          note ? (
            <button key={label} type="button" onClick={newNote} disabled={pending} className={tile}>
              <Icon className="h-[18px] w-[18px] shrink-0 text-accent" strokeWidth={2} />
              {label}
            </button>
          ) : (
            <Link key={label} href={href!} onClick={close} className={tile}>
              <Icon className="h-[18px] w-[18px] shrink-0 text-accent" strokeWidth={2} />
              {label}
            </Link>
          ),
        )}
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );

  if (variant === "sidebar") {
    return (
      <div className="relative mt-4 shrink-0">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => {
            const r = buttonRef.current?.getBoundingClientRect();
            // Rechts neben der Seitenleiste, auf Höhe des Knopfs
            if (r) setPos({ left: r.right + 12, top: Math.max(12, Math.min(r.top - 12, window.innerHeight - 360)) });
            setOpenAt(open ? null : pathname);
          }}
          aria-expanded={open}
          data-tour="compose"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-strong px-4 py-2.5 text-[15px] font-medium text-on-accent-strong transition hover:opacity-90"
        >
          <Plus className="h-[18px] w-[18px]" strokeWidth={2.4} />
          Erstellen
        </button>
        {/* Über dem Portal, weil die Seitenleiste ihren Inhalt scrollt und das Popover sonst abschneidet */}
        {open &&
          pos &&
          createPortal(
            <div ref={boxRef} style={{ left: pos.left, top: pos.top }} className="menu-pop fixed z-50 w-80 rounded-2xl border border-line bg-surface p-3 shadow-lg">
              {panel}
            </div>,
            document.body,
          )}
      </div>
    );
  }

  return (
    <>
      <button ref={buttonRef} type="button" onClick={() => setOpenAt(pathname)} aria-label="Erstellen" aria-expanded={open} data-tour="compose" className="flex flex-1 items-center justify-center py-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-strong text-on-accent-strong shadow-sm transition active:scale-90">
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </span>
      </button>
      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[60] bg-black/40" onClick={close} aria-hidden />
            <div
              role="dialog"
              aria-label="Erstellen"
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
