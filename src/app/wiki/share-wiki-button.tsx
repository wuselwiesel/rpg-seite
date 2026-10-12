"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Link2, MessageCircle, Send, Share2 } from "lucide-react";
import { CharacterAvatar } from "@/components/character-avatar";
import { listShareChats, sendWikiPageToChat, type ShareChat } from "@/app/redaktion/chat/share-actions";

type View = "menu" | "chats";

// Wiki-Seite teilen: in einen Chat der Redaktion senden, per WhatsApp, Link kopieren oder über das Teilen-Menü des Geräts.
// Andere sehen die Seite nur, wenn sie angemeldet und in der Welt sind.
export function ShareWikiButton({ pageId, title }: { pageId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");
  const [chats, setChats] = useState<ShareChat[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.resolve().then(() => setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function"));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const url = () => `${window.location.origin}/wiki/${pageId}`;

  function toggle() {
    setOpen((v) => !v);
    setView("menu");
    setMessage(null);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url());
      setMessage("Link kopiert");
    } catch {
      setMessage("Kopieren nicht möglich");
    }
  }

  function whatsapp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${title}\n${url()}`)}`, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, url: url() });
      setOpen(false);
    } catch {
      /* abgebrochen */
    }
  }

  function openChats() {
    setView("chats");
    setMessage(null);
    if (chats === null) {
      startTransition(async () => {
        setChats(await listShareChats());
      });
    }
  }

  function send(chat: ShareChat) {
    setMessage(null);
    startTransition(async () => {
      const err = await sendWikiPageToChat(chat.id, pageId);
      setMessage(err ?? `An ${chat.title} gesendet`);
    });
  }

  const item = "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-fg transition hover:bg-surface-2";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        title="Seite teilen"
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-fg-soft transition hover:bg-surface-2 hover:text-fg"
      >
        <Share2 className="h-3.5 w-3.5" strokeWidth={2} />
        Teilen
      </button>
      {open && (
        <div className="menu-pop absolute right-0 top-full z-30 mt-1 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-surface p-1.5 shadow-lg">
          {view === "menu" ? (
            <>
              <button type="button" onClick={openChats} className={item}>
                <Send className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
                In einen Chat senden
              </button>
              <button type="button" onClick={whatsapp} className={item}>
                <MessageCircle className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
                WhatsApp
              </button>
              <button type="button" onClick={copy} className={item}>
                <Link2 className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
                Link kopieren
              </button>
              {canShare && (
                <button type="button" onClick={nativeShare} className={item}>
                  <Share2 className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
                  Weitere …
                </button>
              )}
            </>
          ) : (
            <>
              <button type="button" onClick={() => setView("menu")} className="mb-1 px-2.5 py-1 text-xs text-muted transition hover:text-fg">
                ← Zurück
              </button>
              <ul className="flex max-h-64 flex-col overflow-y-auto">
                {chats === null && <li className="px-2.5 py-2 text-sm text-muted">Lade …</li>}
                {chats?.length === 0 && <li className="px-2.5 py-2 text-sm text-muted">Keine Chats</li>}
                {chats?.map((c) => (
                  <li key={c.id}>
                    <button type="button" disabled={pending} onClick={() => send(c)} className={`${item} disabled:opacity-60`}>
                      <CharacterAvatar name={c.title} avatarUrl={c.avatarUrl} size={28} />
                      <span className="min-w-0 truncate">{c.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {message && (
            <p role="status" className="mt-1 flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted">
              <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              {message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
