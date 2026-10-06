"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AccountMiniRoom } from "@/components/bubble-rooms";

// Chat nur für diese Szene (außerhalb des Spiels, zwischen den Accounts). Beim Öffnen wird man als Mitglied eingetragen.
export function SceneChatPanel({ storyPostId, userId, onOpened }: { storyPostId: string; userId: string; onOpened: (chatId: string) => void }) {
  const [state, setState] = useState<{ chatId: string | null; error: string | null }>({ chatId: null, error: null });

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
    <div className="flex h-[min(26rem,55dvh)] flex-col overflow-hidden rounded-xl border border-line bg-surface">
      <AccountMiniRoom chatId={state.chatId} userId={userId} />
    </div>
  );
}
