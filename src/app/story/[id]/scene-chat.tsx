"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AccountMiniRoom } from "@/components/bubble-rooms";
import type { QuoteDraft } from "@/lib/scene-quote";

// Chat nur für diese Szene (außerhalb des Spiels, zwischen den Accounts). Beim Öffnen wird man als Mitglied eingetragen.
export function SceneChatPanel({
  storyPostId,
  userId,
  onOpened,
  quoteDraft,
  onQuoteChange,
}: {
  storyPostId: string;
  userId: string;
  onOpened: (chatId: string) => void;
  quoteDraft: QuoteDraft | null;
  onQuoteChange: (draft: QuoteDraft | null) => void;
}) {
  const [state, setState] = useState<{ chatId: string | null; error: string | null }>({ chatId: null, error: null });
  const panelRef = useRef<HTMLDivElement>(null);

  // Öffnet sich der Chat teilweise unter dem Bildschirmrand, einmal so weit scrollen, dass er ganz (mit Eingabefeld) zu sehen ist
  useEffect(() => {
    if (state.chatId) panelRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [state.chatId]);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .rpc("open_scene_chat", { p_story_post_id: storyPostId })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setState({ chatId: null, error: error?.message === "Keine Berechtigung" ? "Der Chat ist nur für Mitspielende dieser Szene." : (error?.message ?? "Der Chat konnte nicht geöffnet werden.") });
          return;
        }
        setState({ chatId: data as string, error: null });
        onOpened(data as string);
      });
    return () => {
      cancelled = true;
    };
    // onOpened ist ein Setter der übergeordneten Komponente
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyPostId]);

  if (state.error) return <p className="rounded-xl border border-line bg-surface px-4 py-6 text-center text-sm text-muted">{state.error}</p>;
  if (!state.chatId) return <p className="rounded-xl border border-line bg-surface px-4 py-6 text-center text-sm text-muted">Lädt…</p>;
  return (
    <div ref={panelRef} className="flex h-[min(26rem,55dvh)] scroll-mb-32 lg:scroll-mb-6 flex-col overflow-hidden rounded-xl border border-line bg-surface">
      <AccountMiniRoom chatId={state.chatId} userId={userId} quoteDraft={quoteDraft} onQuoteChange={onQuoteChange} />
    </div>
  );
}
