"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Camera } from "lucide-react";
import { getAppMode } from "@/lib/app-mode";

export function ModeSwitch() {
  const mode = getAppMode(usePathname());

  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1 text-sm font-medium">
      <Link
        href="/"
        className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 transition ${
          mode === "ingame" ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"
        }`}
      >
        <Camera className="h-4 w-4" strokeWidth={2} />
        Ingame
      </Link>
      <Link
        href="/story"
        className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 transition ${
          mode === "story" ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"
        }`}
      >
        <BookOpen className="h-4 w-4" strokeWidth={2} />
        Story
      </Link>
    </div>
  );
}

export function MobileModeButton() {
  const mode = getAppMode(usePathname());
  const toStory = mode === "ingame";

  return (
    <Link
      href={toStory ? "/story" : "/"}
      className="flex items-center gap-1.5 rounded-full bg-accent-strong px-3 py-1.5 text-xs font-medium text-on-accent-strong transition hover:opacity-90"
    >
      {toStory ? (
        <BookOpen className="h-3.5 w-3.5" strokeWidth={2} />
      ) : (
        <Camera className="h-3.5 w-3.5" strokeWidth={2} />
      )}
      {toStory ? "Story" : "Ingame"}
    </Link>
  );
}
