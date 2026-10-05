"use client";

import { useState } from "react";
import { EyeOff } from "lucide-react";

// Verbirgt als Spoiler markierte Szenen und Nachrichten hinter einem Knopf, bis man sie aufdeckt.
export function SpoilerGate({ spoiler, children, className = "" }: { spoiler: boolean; children: React.ReactNode; className?: string }) {
  const [shown, setShown] = useState(false);
  if (!spoiler || shown) return <>{children}</>;
  return (
    <button
      type="button"
      onClick={() => setShown(true)}
      className={`flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-surface-2/60 px-4 py-3 text-sm text-fg-soft transition hover:bg-surface-2 hover:text-fg ${className}`}
    >
      <EyeOff className="h-4 w-4" strokeWidth={1.75} />
      Spoiler anzeigen
    </button>
  );
}
