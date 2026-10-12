"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { SymbolPicker } from "@/components/symbol-picker";
import { CharacterAvatar } from "@/components/character-avatar";
import { NameBadge } from "@/components/name-badge";
import { CustomEmojiPicker } from "@/components/custom-emoji-picker";
import { EmojiText } from "@/components/custom-emoji-provider";
import { OnlineToggle, useOnline } from "@/components/online-status";
import { setPresenceStatus } from "@/app/profile/actions";
import { PRESENCE_EMOJI_MAX, PRESENCE_TEXT_MAX, cleanPresenceEmoji } from "@/lib/presence-emoji";

export type OnlineMember = { id: string; name: string; avatarUrl: string | null };

// Wer aus der Welt gerade online ist (ohne dich)
export function useOnlineMembers(members: OnlineMember[], selfId: string) {
  const { enabled, onlineIds } = useOnline();
  return enabled ? members.filter((m) => m.id !== selfId && onlineIds.has(m.id)) : [];
}

// Eigener Status wie bei Discord: Emoji (statt des grünen Punkts) und ein kurzer Text, dazu Online/Offline
function StatusEditor({ onDone }: { onDone: () => void }) {
  const { own, setLook } = useOnline();
  const [emoji, setEmoji] = useState(own.emoji ?? "");
  const [text, setText] = useState(own.text ?? "");
  const [error, setError] = useState<string | null>(null);
  const [symbols, setSymbols] = useState(false);
  const [pending, startTransition] = useTransition();
  const invalid = emoji.trim() !== "" && !cleanPresenceEmoji(emoji);

  function save(nextEmoji: string, nextText: string) {
    setError(null);
    startTransition(async () => {
      const err = await setPresenceStatus(nextEmoji, nextText);
      if (err) return setError(err);
      setLook({ emoji: cleanPresenceEmoji(nextEmoji), text: nextText.replace(/\s+/g, " ").trim().slice(0, PRESENCE_TEXT_MAX) || null });
      onDone();
    });
  }

  return (
    <div className="mx-2 mb-1 mt-0.5 flex flex-col gap-2 rounded-lg border border-line bg-surface p-2.5">
      <OnlineToggle />
      <div className="flex items-center gap-1.5">
        <CustomEmojiPicker
          direction="up"
          label="Emoji für den Status wählen"
          onPick={(token) => setEmoji(token.trim())}
          className="shrink-0"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-app text-lg">
            {emoji ? <EmojiText text={emoji} /> : <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-emerald-500" />}
          </span>
        </CustomEmojiPicker>
        <input
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          maxLength={PRESENCE_EMOJI_MAX}
          aria-label="Status-Emoji"
          aria-invalid={invalid}
          placeholder="🌙"
          className="sr-only"
          tabIndex={-1}
        />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !invalid) {
              e.preventDefault();
              save(emoji, text);
            }
          }}
          maxLength={PRESENCE_TEXT_MAX}
          aria-label="Status-Text"
          placeholder="Was machst du gerade?"
          className="h-9 min-w-0 flex-1 rounded-md border border-line bg-app px-2.5 text-sm outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={() => setSymbols((v) => !v)}
          aria-expanded={symbols}
          aria-label="Symbole"
          title="Symbole"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line text-base transition ${symbols ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg"}`}
        >
          ✦
        </button>
      </div>
      {symbols && (
        <SymbolPicker
          onPick={(symbol) =>
            // Kurze Zeichen als Statussymbol, Zierleisten und Trenner in den Text
            Array.from(symbol).length <= 3 ? setEmoji(symbol) : setText((t) => `${t}${symbol}`.slice(0, PRESENCE_TEXT_MAX))
          }
          onClose={() => setSymbols(false)}
        />
      )}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex items-center gap-1.5">
        <button type="button" disabled={pending || invalid} onClick={() => save(emoji, text)} className="rounded-md bg-accent-strong px-3 py-1.5 text-xs font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50">
          {pending ? "Speichere …" : "Status speichern"}
        </button>
        {(own.emoji || own.text) && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setEmoji("");
              setText("");
              save("", "");
            }}
            className="rounded-md px-2.5 py-1.5 text-xs text-muted transition hover:text-fg"
          >
            Status löschen
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ m, online, selfId, open, onToggle }: { m: OnlineMember; online: boolean; selfId: string; open: boolean; onToggle: () => void }) {
  const { looks } = useOnline();
  const look = looks.get(m.id);
  const self = m.id === selfId;
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1 text-left transition hover:bg-surface-2 ${online ? "" : "opacity-55"}`}
      >
        <span className="relative shrink-0">
          <CharacterAvatar name={m.name} avatarUrl={m.avatarUrl} size={28} />
          <span
            aria-hidden
            className={`absolute -bottom-0.5 -right-0.5 box-content h-2.5 w-2.5 rounded-full border-2 border-app ${online ? "bg-emerald-500" : "bg-fg/30"}`}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-sm text-fg">
            <span className="truncate">{m.name}</span>
            <NameBadge userId={m.id} symbolOnly />
            {look?.emoji && online && (
              <span aria-hidden className="shrink-0 text-xs leading-none">
                <EmojiText text={look.emoji} />
              </span>
            )}
          </span>
          {online && look?.writing ? (
            <span className="flex items-center gap-1.5 text-xs text-muted" role="status">
              <span className="flex gap-0.5">
                <span className="typing-dot" />
                <span className="typing-dot [animation-delay:150ms]" />
                <span className="typing-dot [animation-delay:300ms]" />
              </span>
              schreibt gerade
            </span>
          ) : online && look?.text ? (
            <span className="block truncate text-xs text-muted">
              <EmojiText text={look.text} />
            </span>
          ) : null}
        </span>
      </button>
      {open &&
        (self ? (
          <StatusEditor onDone={onToggle} />
        ) : (
          <div className="mx-2 mb-1 mt-0.5 flex flex-wrap gap-1.5 rounded-lg border border-line bg-surface p-2.5">
            <Link href={`/redaktion/chat/mit/${m.id}`} className="rounded-md bg-accent-strong px-2.5 py-1 text-xs font-medium text-on-accent-strong transition hover:opacity-90">
              Nachricht senden
            </Link>
            <Link href={`/redaktion/profil/${m.id}`} className="rounded-md border border-line px-2.5 py-1 text-xs text-fg-soft transition hover:text-fg">
              Profil ansehen
            </Link>
          </div>
        ))}
    </li>
  );
}

function Group({ title, items, isOnline, selfId, openId, setOpenId }: { title: string; items: OnlineMember[]; isOnline: (m: OnlineMember) => boolean; selfId: string; openId: string | null; setOpenId: (id: string | null) => void }) {
  if (items.length === 0) return null;
  return (
    <section aria-label={title}>
      <h3 className="px-2 pb-0.5 pt-2 text-[11px] font-medium text-muted">
        {title} — {items.length}
      </h3>
      <ul className="flex flex-col gap-0.5">
        {items.map((m) => (
          <Row key={m.id} m={m} online={isOnline(m)} selfId={selfId} open={openId === m.id} onToggle={() => setOpenId(openId === m.id ? null : m.id)} />
        ))}
      </ul>
    </section>
  );
}

// Mitgliederliste wie bei Discord: „Online — n“ und „Offline — m“, grüner bzw. grauer Punkt am Bild.
// Ein Klick auf ein Mitglied klappt „Nachricht senden“ / „Profil ansehen“ auf, bei dir selbst den Status-Editor.
export function MemberList({ members, selfId, className = "" }: { members: OnlineMember[]; selfId: string; className?: string }) {
  const { enabled, onlineIds } = useOnline();
  const [openId, setOpenId] = useState<string | null>(null);
  if (!enabled) return null;
  const isOnline = (m: OnlineMember) => onlineIds.has(m.id);
  const byName = (a: OnlineMember, b: OnlineMember) => a.name.localeCompare(b.name, "de");
  const common = { isOnline, selfId, openId, setOpenId };
  return (
    <div className={className}>
      <Group title="Online" items={members.filter(isOnline).sort(byName)} {...common} />
      <Group title="Offline" items={members.filter((m) => !isOnline(m)).sort(byName)} {...common} />
    </div>
  );
}
