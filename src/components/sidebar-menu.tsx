"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Compass, Menu, Settings, UserPlus, Users } from "lucide-react";
import { InstallAppButton } from "./install-app-button";
import { startTour } from "@/lib/tour";

// Hamburger-Menü in der Desktop-Seitenleiste: seltener genutzte Bereiche: Freund:innen, Charaktere, Konto.
export function SidebarMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const item =
    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menü"
        aria-expanded={open}
        data-tour="account-menu"
        className="flex h-9 w-9 items-center justify-center rounded-full text-fg-soft transition hover:bg-surface-2 hover:text-fg"
      >
        <Menu className="h-[18px] w-[18px]" strokeWidth={2} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-60 rounded-2xl border border-line bg-surface p-2 shadow-lg">
          <Link href="/friends" onClick={() => setOpen(false)} className={item}>
            <UserPlus className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            Freund:innen
          </Link>
          <Link href="/characters" onClick={() => setOpen(false)} className={item}>
            <Users className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            Charaktere verwalten
          </Link>
          <Link href="/profile" onClick={() => setOpen(false)} className={item}>
            <Settings className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            Konto &amp; Einstellungen
          </Link>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              startTour();
            }}
            className={item}
          >
            <Compass className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            Rundgang starten
          </button>
          <InstallAppButton className={item} onDone={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
