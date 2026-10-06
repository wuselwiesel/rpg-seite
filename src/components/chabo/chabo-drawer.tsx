"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IdCard, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mergeSecrets, normalizeSheet, parseSecrets, stripSecrets, type SheetData } from "@/lib/sheet-rules";
import { fetchRandomLists } from "@/lib/random-lists";
import type { CustomPools } from "@/lib/random-pools";
import { Chabo } from "./chabo";
import { highlightEntries } from "@/lib/scene-quote";
import type { Character } from "@/lib/types";

// Knopf mit seitlichem Fenster: der ChaBo des Charakters, ohne die Szene zu verlassen.
export function ChaboDrawer({ characterId, characterName, mentionCharacters = [] }: { characterId: string; characterName: string; mentionCharacters?: Character[] }) {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState<SheetData | null | undefined>(undefined);
  const [randomLists, setRandomLists] = useState<CustomPools | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("character_sheets").select("data").eq("character_id", characterId).maybeSingle<{ data: unknown }>();
      if (!data) {
        if (!cancelled) setSheet(null);
        return;
      }
      // Geheimes bekommt nur die Besitzer:in (RLS); das Fenster zeigt immer den Bogen eines eigenen Charakters
      const { data: secret } = await supabase.from("character_sheet_secrets").select("data").eq("character_id", characterId).maybeSingle<{ data: unknown }>();
      const open = stripSecrets(normalizeSheet(data.data));
      // Eigene Zufallslisten der Welt dieses Charakters
      const { data: ch } = await supabase.from("characters").select("world_id").eq("id", characterId).maybeSingle<{ world_id: string }>();
      const lists = ch ? await fetchRandomLists(supabase, ch.world_id) : undefined;
      if (!cancelled) setRandomLists(lists);
      if (!cancelled) setSheet(secret ? mergeSecrets(open, parseSecrets(secret.data)) : open);
    })();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    // Die Seite dahinter bleibt stehen, damit am Handy nur das Fenster scrollt
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelled = true;
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, characterId]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="ChaBo öffnen"
        aria-label="ChaBo öffnen"
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg"
      >
        <IdCard className="h-4 w-4" strokeWidth={2} />
      </button>
      {/* Per Portal an <body>, sonst liegen Kopfzeile und untere Leiste der Seite über dem Fenster */}
      {open &&
        createPortal(
        <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-label={`Charakterbogen ${characterName}`}>
          <button type="button" aria-label="Schließen" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/30" />
          <aside
            // Ein Link im Fenster (z. B. „Zur Szene“) schließt es; liegt das Ziel in dieser Szene, wird es gleich hervorgehoben
            onClick={(e) => {
              const link = (e.target as HTMLElement).closest("a");
              if (!link) return;
              setOpen(false);
              const url = new URL(link.href, location.href);
              const ids = (url.searchParams.get("hervor") ?? "").split(",").filter(Boolean);
              if (url.pathname === location.pathname && ids.length) window.setTimeout(() => highlightEntries(ids), 150);
            }}
            className="relative flex h-dvh max-h-dvh w-full max-w-md flex-col overflow-y-auto overscroll-contain bg-app p-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-xl sm:p-4 sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <button type="button" onClick={() => setOpen(false)} aria-label="Schließen" className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-muted transition hover:text-fg">
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
            {sheet === undefined ? (
              <p className="p-6 text-sm text-muted">Lädt …</p>
            ) : sheet === null ? (
              <p className="p-6 text-sm text-muted">
                {characterName} hat noch keinen ChaBo.{" "}
                <a href={`/characters/${characterId}/chabo`} className="text-accent underline underline-offset-2">
                  Jetzt anlegen
                </a>
              </p>
            ) : (
              <Chabo key={characterId} characterId={characterId} characterName={characterName} initial={sheet} editable mentionCharacters={mentionCharacters} randomLists={randomLists} variant="panel" />
            )}
          </aside>
        </div>,
        document.body,
      )}
    </>
  );
}
