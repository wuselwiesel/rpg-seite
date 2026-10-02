"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { toggleWikiFavorite } from "../actions";

export function FavoriteButton({ wikiPageId, initial }: { wikiPageId: string; initial: boolean }) {
  const [favorite, setFavorite] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !favorite;
    setFavorite(next); // sofort zeigen, bei Fehler zurücksetzen
    setError(null);
    startTransition(async () => {
      const res = await toggleWikiFavorite(wikiPageId);
      if ("error" in res) {
        setFavorite(!next);
        setError(res.error);
      } else setFavorite(res.favorite);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={favorite}
      title={error ?? (favorite ? "Aus den Favoriten entfernen" : "Zu den Favoriten")}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition hover:bg-surface-2 ${
        favorite ? "text-accent" : "text-fg-soft hover:text-fg"
      } ${error ? "ring-1 ring-red-500" : ""}`}
    >
      <Star className="h-3.5 w-3.5" strokeWidth={2} fill={favorite ? "currentColor" : "none"} />
      {favorite ? "Favorit" : "Merken"}
    </button>
  );
}
