"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookMarked, CircleHelp, Feather, Type } from "lucide-react";
import { SceneChatPanel } from "./scene-chat";
import { QUOTE_EVENT, type QuoteDraft } from "@/lib/scene-quote";
import { createClient } from "@/lib/supabase/client";
import { StoryEntryForm } from "./story-entry-form";
import { DiceRollForm } from "./dice-roll-form";
import { NextSceneForm } from "./next-scene-form";
import { WriterSelect } from "@/components/writer-select";
import { ChaboDrawer } from "@/components/chabo/chabo-drawer";
import type { Character } from "@/lib/types";
import type { WikiCalendar } from "@/lib/wiki-calendar";

export function StoryComposer({
  storyPostId,
  worldId,
  ownCharacters,
  activeCharacterId,
  characters,
  participantIds,
  calendar,
  locations,
  sceneLocation,
  userId,
  startInChat = false,
}: {
  storyPostId: string;
  worldId: string;
  // Eigene Charaktere in dieser Welt (zur Auswahl) und der aktuell aktive.
  ownCharacters: Character[];
  activeCharacterId: string | null;
  // Alle ansprechbaren Charaktere der Welt (Erwähnungen, Wurf-Ziel, "Danach dran").
  characters: Character[];
  participantIds: string[];
  calendar: WikiCalendar;
  locations: string[];
  sceneLocation: string | null;
  // Eigenes Konto (für den Chat dieser Szene) und ob der Reiter „Chat“ gleich offen sein soll (Link aus einer Benachrichtigung)
  userId: string;
  startInChat?: boolean;
}) {
  const [writerId, setWriterId] = useState(activeCharacterId ?? ownCharacters[0]?.id ?? "");

  // Wer zuletzt in dieser Szene geschrieben hat, bleibt auch nach einem Neuladen ausgewählt.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`wortwinkel:writer:${storyPostId}`);
      if (saved && saved !== writerId && ownCharacters.some((c) => c.id === saved)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Browser-Speicher ist erst nach dem Hydrieren lesbar
        setWriterId(saved);
      }
    } catch {
      /* egal */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyPostId]);

  // Beim Wechsel des schreibenden Charakters bleibt ein begonnener Entwurf stehen – nur wer
  // ausgewählt ist, ändert sich.
  function changeWriter(id: string) {
    setWriterId(id);
    try {
      localStorage.setItem(`wortwinkel:writer:${storyPostId}`, id);
    } catch {
      /* egal */
    }
  }
  const writer = ownCharacters.find((c) => c.id === writerId) ?? ownCharacters[0] ?? null;
  const others = characters.filter((c) => c.id !== writerId);
  const [mode, setMode] = useState<"write" | "roll" | "chat">(startInChat ? "chat" : "write");
  // Chat dieser Szene: erst bekannt, wenn man dabei ist; ungelesene Nachrichten als Punkt am Reiter
  const [sceneChatId, setSceneChatId] = useState<string | null>(null);
  const [chatUnread, setChatUnread] = useState(0);
  // Zitat aus der Szene (markierte Nachrichten oder ein Ausschnitt) für die nächste Chat-Nachricht
  const [quoteDraft, setQuoteDraft] = useState<QuoteDraft | null>(null);
  useEffect(() => {
    const onQuote = (e: Event) => {
      setQuoteDraft((e as CustomEvent<QuoteDraft>).detail);
      setMode("chat");
      // Das Eingabefeld des Chats ins Bild holen, damit man das Zitat sieht
      window.setTimeout(() => document.querySelector('[data-tour="story-composer"]')?.scrollIntoView({ behavior: "smooth", block: "end" }), 120);
    };
    window.addEventListener(QUOTE_EVENT, onQuote);
    return () => window.removeEventListener(QUOTE_EVENT, onQuote);
  }, []);
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- beim Öffnen des Reiters gilt alles als gelesen
    if (mode === "chat") setChatUnread(0);
  }, [mode]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      const { data: chat } = await supabase.from("account_chats").select("id").eq("kind", "scene").eq("story_post_id", storyPostId).maybeSingle();
      if (cancelled || !chat) return;
      setSceneChatId(chat.id);
      const { data: mine } = await supabase.from("account_chat_participants").select("last_read_at").eq("chat_id", chat.id).eq("user_id", userId).maybeSingle();
      const { count } = await supabase
        .from("account_messages")
        .select("id", { count: "exact", head: true })
        .eq("chat_id", chat.id)
        .neq("sender_id", userId)
        .gt("created_at", mine?.last_read_at ?? "1970-01-01T00:00:00Z");
      if (!cancelled && modeRef.current !== "chat") setChatUnread(count ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [storyPostId, userId]);

  useEffect(() => {
    if (!sceneChatId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`scene-chat-unread-${sceneChatId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "account_messages", filter: `chat_id=eq.${sceneChatId}` }, (payload) => {
        const row = payload.new as { sender_id: string };
        if (row.sender_id !== userId && modeRef.current !== "chat") setChatUnread((n) => n + 1);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sceneChatId, userId]);
  const [showToolbar, setShowToolbar] = useState(false);
  const [narrator, setNarrator] = useState(false);
  const [showChapter, setShowChapter] = useState(false);

  // Zeigt anderen, die diese Szene gerade offen haben, wer hier schreibt (wie bei den Chats).
  const [typing, setTyping] = useState<Record<string, { name: string; until: number; kind: "write" | "roll" }>>({});
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const lastTypingSent = useRef(0);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`story-typing-${storyPostId}`)
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const { characterId, name, kind } = payload as { characterId: string; name: string; kind?: "write" | "roll" };
        setTyping((prev) => ({ ...prev, [characterId]: { name, kind: kind ?? "write", until: Date.now() + 4000 } }));
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [storyPostId]);

  // "schreibt gerade..." verschwindet nach ein paar Sekunden ohne neues Signal.
  useEffect(() => {
    if (Object.keys(typing).length === 0) return;
    const timer = setInterval(() => {
      setTyping((prev) => {
        const now = Date.now();
        const next = Object.fromEntries(Object.entries(prev).filter(([, v]) => v.until > now));
        return Object.keys(next).length === Object.keys(prev).length ? prev : next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [typing]);

  function announceTyping(kind: "write" | "roll") {
    const now = Date.now();
    if (now - lastTypingSent.current < 2500) return;
    lastTypingSent.current = now;
    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: {
        characterId: writerId,
        name: kind === "write" && narrator ? "Erzähler:in" : (writer?.name ?? "Jemand"),
        kind,
      },
    });
  }

  // Sobald der Reiter „Würfeln“ offen ist, sehen die anderen „… würfelt“ (statt „schreibt“) – nicht erst nach einer Eingabe.
  const writerName = writer?.name ?? "Jemand";
  useEffect(() => {
    if (mode !== "roll") return;
    const send = () => {
      if (document.visibilityState !== "visible") return;
      channelRef.current?.send({
        type: "broadcast",
        event: "typing",
        payload: { characterId: writerId, name: writerName, kind: "roll" },
      });
    };
    send();
    const timer = setInterval(send, 3000);
    return () => clearInterval(timer);
  }, [mode, writerId, writerName]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex w-fit gap-1 rounded-lg bg-surface-2 p-1">
          <button
            type="button"
            onClick={() => setMode("write")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              mode === "write" ? "bg-surface text-fg" : "text-muted hover:text-fg-soft"
            }`}
          >
            Schreiben
          </button>
          <button
            type="button"
            onClick={() => setMode("roll")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              mode === "roll" ? "bg-surface text-fg" : "text-muted hover:text-fg-soft"
            }`}
          >
            Würfeln
          </button>
          <button
            type="button"
            onClick={() => setMode("chat")}
            className={`relative rounded-md px-3 py-1.5 text-sm font-medium transition ${
              mode === "chat" ? "bg-surface text-fg" : "text-muted hover:text-fg-soft"
            }`}
          >
            Chat
            {chatUnread > 0 && mode !== "chat" && (
              <span aria-label={`${chatUnread} neue Nachrichten`} className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-accent-strong" />
            )}
          </button>
        </div>
        <div className="flex items-center gap-0.5">
          {mode === "roll" && (
            <Link href="/hilfe#wuerfeln" title="Hilfe zum Würfeln" aria-label="Hilfe zum Würfeln" className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg">
              <CircleHelp className="h-4 w-4" strokeWidth={2} />
            </Link>
          )}
          {mode !== "chat" && writer && <ChaboDrawer characterId={writer.id} characterName={writer.name} mentionCharacters={[...ownCharacters, ...characters.filter((c) => !ownCharacters.some((o) => o.id === c.id))]} />}
          {mode === "write" && (
            <>
              <button
                type="button"
                onClick={() => setNarrator((v) => !v)}
                aria-pressed={narrator}
                title={narrator ? "Als Erzähler:in schreiben: an" : "Als Erzähler:in schreiben"}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                  narrator ? "bg-surface-2 text-accent" : "text-muted hover:bg-surface-2 hover:text-fg"
                }`}
              >
                <Feather className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => setShowChapter((v) => !v)}
                aria-pressed={showChapter}
                title="Neues Kapitel (neue Szene) beginnen"
                className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                  showChapter ? "bg-surface-2 text-accent" : "text-muted hover:bg-surface-2 hover:text-fg"
                }`}
              >
                <BookMarked className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => setShowToolbar((v) => !v)}
                title={showToolbar ? "Formatierung ausblenden" : "Formatierung anzeigen"}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                  showToolbar ? "bg-surface-2 text-accent" : "text-muted hover:bg-surface-2 hover:text-fg"
                }`}
              >
                <Type className="h-4 w-4" strokeWidth={2} />
              </button>
            </>
          )}
        </div>
      </div>

      {mode === "chat" && <SceneChatPanel storyPostId={storyPostId} userId={userId} onOpened={setSceneChatId} quoteDraft={quoteDraft} onQuoteChange={setQuoteDraft} />}

      {mode !== "chat" && (mode === "roll" || !narrator) && (
        <WriterSelect shortcuts characters={ownCharacters} value={writerId} onChange={changeWriter} />
      )}
      {mode === "write" && narrator && (
        <p className="text-xs text-muted">
          Du schreibst als <span className="text-sm font-medium text-fg-soft">Erzähler:in</span> – ohne Charakter.
        </p>
      )}

      {mode === "write" && showChapter && (
        <NextSceneForm storyPostId={storyPostId} writerId={writerId} calendar={calendar} locations={locations} location={sceneLocation} onDone={() => setShowChapter(false)} />
      )}

      {mode !== "chat" && Object.keys(typing).length > 0 && (
        <div className="-mt-1 flex items-center gap-2 text-xs text-muted" role="status">
          <span className="flex gap-0.5">
            <span className="typing-dot" />
            <span className="typing-dot [animation-delay:150ms]" />
            <span className="typing-dot [animation-delay:300ms]" />
          </span>
          {Object.values(typing)
            .map((t) => `${t.name} ${t.kind === "roll" ? "würfelt" : "schreibt"}`)
            .join(", ")}
          …
        </div>
      )}


      {mode === "chat" ? null : mode === "write" ? (
        <StoryEntryForm
          storyPostId={storyPostId}
          worldId={worldId}
          characterName={writer?.name ?? "deinem Charakter"}
          characters={characters}
          participantIds={participantIds}
          narrator={narrator}
          showToolbar={showToolbar}
          writerId={writerId}
          onTyping={() => announceTyping("write")}
        />
      ) : (
        <DiceRollForm
          storyPostId={storyPostId}
          worldId={worldId}
          sheetUrl={writer?.sheet_url}
          targets={others}
          writerId={writerId}
          onTyping={() => announceTyping("roll")}
        />
      )}
    </div>
  );
}
