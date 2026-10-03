"use client";

import { CalendarDays, FileText, Gem, MapPin, PawPrint, ScrollText, User, Users, type LucideIcon } from "lucide-react";
import { EmojiText } from "./custom-emoji-provider";
import { useWikiTypes } from "./wiki-types-context";
import { wikiTypeOf, type WikiType } from "@/lib/wiki-types";
import { folderColorHex } from "@/lib/wiki-folder-style";

const ICONS: Record<string, LucideIcon> = {
  "map-pin": MapPin,
  "paw-print": PawPrint,
  users: Users,
  user: User,
  "calendar-days": CalendarDays,
  "scroll-text": ScrollText,
  gem: Gem,
  "file-text": FileText,
};

// Symbol einer Art selbst (Standard-Symbol oder Emoji), zum Beispiel in der Verwaltung.
export function TypeGlyph({ type, className = "h-4 w-4", colored = false }: { type: WikiType; className?: string; colored?: boolean }) {
  const Icon = ICONS[type.icon];
  const hex = colored ? folderColorHex(type.color) : null;
  if (Icon) return <Icon aria-hidden className={className} strokeWidth={1.75} style={hex ? { color: hex } : undefined} />;
  return (
    <span aria-hidden className="inline-flex shrink-0 items-center justify-center leading-none">
      <EmojiText text={type.icon} />
    </span>
  );
}

export function WikiTypeIcon({ type, className = "h-4 w-4" }: { type: string | null | undefined; className?: string }) {
  const types = useWikiTypes();
  const t = wikiTypeOf(type, types);
  if (!t) return null;
  return <TypeGlyph type={t} className={className} />;
}

// Kleine Beschriftung „Ort“ mit Symbol, z. B. über dem Titel oder auf Karten.
export function WikiTypeBadge({ type }: { type: string | null | undefined }) {
  const types = useWikiTypes();
  const t = wikiTypeOf(type, types);
  if (!t) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-fg-soft">
      <TypeGlyph type={t} className="h-3.5 w-3.5" />
      {t.label}
    </span>
  );
}
