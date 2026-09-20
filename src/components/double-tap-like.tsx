"use client";

import { useRef, useState } from "react";
import { Heart } from "lucide-react";

export const POST_LIKE_EVENT = "wortwinkel:post-like";

// Doppeltipp (Handy) bzw. Doppelklick (Desktop) auf ein Post-Medium = "Gefällt mir" mit Herz-Animation.
// Liken passiert nur, nie unliken – wie bei Instagram. Die ReactionBar hört auf das Event.
export function DoubleTapLike({
  likeKey,
  className = "",
  heartClassName = "h-24 w-24",
  children,
}: {
  // Post- oder Nachrichten-ID; die passende ReactionBar hört auf dieses Event.
  likeKey: string;
  className?: string;
  heartClassName?: string;
  children: React.ReactNode;
}) {
  const last = useRef<{ t: number; x: number; y: number } | null>(null);
  const nextId = useRef(0);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);

  function like(e: React.PointerEvent<HTMLDivElement>) {
    window.dispatchEvent(new CustomEvent(POST_LIKE_EVENT, { detail: { key: likeKey } }));
    const rect = e.currentTarget.getBoundingClientRect();
    const id = nextId.current++;
    setHearts((h) => [...h, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setHearts((h) => h.filter((x) => x.id !== id)), 950);
    navigator.vibrate?.(12);
  }

  return (
    <div
      className={`relative select-none [-webkit-touch-callout:none] ${className}`}
      style={{ touchAction: "manipulation" }}
      onPointerUp={(e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        const now = Date.now();
        const l = last.current;
        if (l && now - l.t < 320 && Math.hypot(e.clientX - l.x, e.clientY - l.y) < 48) {
          last.current = null;
          like(e);
        } else {
          last.current = { t: now, x: e.clientX, y: e.clientY };
        }
      }}
    >
      {children}
      {hearts.map((h) => (
        <Heart
          key={h.id}
          aria-hidden
          className={`heart-pop pointer-events-none absolute ${heartClassName} fill-white text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]`}
          strokeWidth={0}
          style={{ left: h.x, top: h.y }}
        />
      ))}
    </div>
  );
}
