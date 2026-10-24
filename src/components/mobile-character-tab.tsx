"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { openWhoSheet } from "@/lib/use-switch-character";
import { CharacterAvatar } from "./character-avatar";

// Charakter-Tab der Handy-Leiste: Tipp öffnet das Profil; zweiter Tipp auf dem eigenen Profil oder langes Drücken öffnet „Du spielst“.
export function MobileCharacterTab({ href, label, avatar }: { href: string; label: string; avatar: { name: string; url: string | null } | null }) {
  const pathname = usePathname();
  const active = pathname === href || pathname?.startsWith(`${href}/`);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  const startPress = () => {
    longPressed.current = false;
    timer.current = setTimeout(() => {
      longPressed.current = true;
      openWhoSheet();
    }, 500);
  };
  const endPress = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      onPointerDown={startPress}
      onPointerUp={endPress}
      onPointerLeave={endPress}
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => {
        if (longPressed.current || pathname === href) {
          e.preventDefault();
          if (!longPressed.current) openWhoSheet();
        }
      }}
      className={`flex flex-1 select-none flex-col items-center justify-center gap-0.5 py-3 text-[11px] font-medium [-webkit-touch-callout:none] ${active ? "text-fg" : "text-muted"}`}
    >
      <span className={`rounded-full ring-2 ring-offset-1 ring-offset-surface ${active ? "ring-fg" : "ring-transparent"}`}>
        {avatar ? <CharacterAvatar name={avatar.name} avatarUrl={avatar.url} size={22} /> : <span className="block h-[22px] w-[22px] rounded-full border-[1.5px] border-dashed border-current" />}
      </span>
      <span className="max-w-16 truncate">{label}</span>
    </Link>
  );
}
