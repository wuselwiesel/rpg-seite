"use client";

import { Menu } from "lucide-react";
import { openSettingsSheet } from "./settings-sheet";

// ≡ im eigenen Profil (Handy): öffnet den Einstellungen-Bogen
export function SettingsMenuButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={openSettingsSheet}
      aria-label="Einstellungen"
      data-tour="account-menu"
      className={`flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/50 ${className}`}
    >
      <Menu className="h-5 w-5" strokeWidth={2} />
    </button>
  );
}
