"use client";

import { useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { SettingsList } from "./settings-sheet";
import type { World } from "@/lib/types";

// ≡ in der Seitenleiste (Computer): Einstellungen und Seltenes, dieselbe Liste wie der Einstellungen-Bogen am Handy.
export function SidebarMenu({ appAdmin = false, altAccount = null, worlds = [], activeWorldId = null }: { appAdmin?: boolean; altAccount?: string | null; worlds?: World[]; activeWorldId?: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    if (open) {
      document.addEventListener("mousedown", onDown);
      document.addEventListener("keydown", onKey);
    }
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

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
        <div className="menu-pop absolute left-0 top-full z-50 mt-2 max-h-[80vh] w-72 overflow-y-auto rounded-2xl border border-line bg-surface p-2 shadow-lg">
          <SettingsList appAdmin={appAdmin} altAccount={altAccount} worlds={worlds} activeWorldId={activeWorldId} search={false} onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
