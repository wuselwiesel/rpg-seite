"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCharacterPresence } from "@/app/characters/presence-actions";

// Grüner Punkt (online) oder grauer Punkt (offline) eines Charakters. Mit overlay sitzt er unten rechts auf einem Bild.
export function PresenceDot({ online, overlay = false, className = "" }: { online: boolean | null | undefined; overlay?: boolean; className?: string }) {
  if (online == null) return null;
  const label = online ? "Online" : "Offline";
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${online ? "bg-emerald-500" : "bg-neutral-400 dark:bg-neutral-500"} ${
        overlay ? "absolute bottom-0 right-0 box-content h-3 w-3 border-2 border-app" : ""
      } ${className}`}
    />
  );
}

// Punkt mit Wort dahinter, z. B. unter dem Namen im Chat
export function PresenceBadge({ online, className = "" }: { online: boolean | null | undefined; className?: string }) {
  if (online == null) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${online ? "text-emerald-700 dark:text-emerald-400" : "text-muted"} ${className}`}>
      <PresenceDot online={online} />
      {online ? "Online" : "Offline"}
    </span>
  );
}

// Der Punkt eines eigenen Charakters zum Antippen: öffnet ein kleines Menü mit Online und Offline (wie bei Discord).
// `placement` setzt ihn unten rechts/links auf das Profilbild; sonst steht er für sich.
export function PresenceControl({ characterId, online, placement = "inline", className = "" }: { characterId: string; online: boolean; placement?: "inline" | "bottom-right" | "bottom-left"; className?: string }) {
  const overlay = placement !== "inline";
  const [value, setValue] = useState(online);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLSpanElement>(null);

  // Von außen geänderter Wert (anderer Charakter gewählt, Seite neu geladen)
  const [seen, setSeen] = useState({ online, characterId });
  if (seen.online !== online || seen.characterId !== characterId) {
    setSeen({ online, characterId });
    setValue(online);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(next: boolean) {
    setOpen(false);
    if (next === value) return;
    setValue(next);
    startTransition(async () => {
      const error = await setCharacterPresence(characterId, next);
      if (error) setValue(!next);
      else router.refresh();
    });
  }

  const item = (next: boolean, label: string, dot: string) => (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={value === next}
      onClick={() => choose(next)}
      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition hover:bg-surface-2 ${value === next ? "font-medium text-fg" : "text-fg-soft"}`}
    >
      <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${dot}`} />
      {label}
    </button>
  );

  return (
    <span ref={ref} className={`${placement === "bottom-right" ? "absolute bottom-0 right-0" : placement === "bottom-left" ? "absolute bottom-0 left-0" : "relative inline-flex"} ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={value ? "Online – Status ändern" : "Offline – Status ändern"}
        title={value ? "Online" : "Offline"}
        className="flex h-5 w-5 items-center justify-center rounded-full"
      >
        <PresenceDot online={value} overlay={false} className={overlay ? "box-content h-3 w-3 border-2 border-app" : ""} />
      </button>
      {open && (
        <div role="menu" className="absolute left-0 top-full z-50 mt-1 w-32 rounded-lg border border-line bg-surface p-1 shadow-lg">
          {item(true, "Online", "bg-emerald-500")}
          {item(false, "Offline", "bg-neutral-400 dark:bg-neutral-500")}
        </div>
      )}
    </span>
  );
}
