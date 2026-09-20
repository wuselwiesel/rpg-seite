"use client";

import { useRef } from "react";
import Link from "next/link";
import { CornerUpLeft, Pencil, Play, Trash2 } from "lucide-react";
import { CharacterAvatar } from "@/components/character-avatar";
import { DoubleTapLike } from "@/components/double-tap-like";
import { ReactionBar } from "@/components/reaction-bar";
import { PROFILE_FONTS } from "@/lib/profile-theme";
import { formatDateTime } from "@/lib/format";
import { firstImageSrc, stripHtml } from "@/lib/strip-html";
import { storyBackground } from "@/lib/stories";
import type { ReactionSummary } from "@/lib/reactions";
import type { Character, Message } from "@/lib/types";

const SWIPE_TRIGGER = 56;

function SharedPostCard({ post, onDark }: { post: NonNullable<Message["shared_post"]>; onDark: boolean }) {
  const thumb =
    post.media_urls?.[0] ?? (post.media_type === "image" ? post.media_url : null) ?? firstImageSrc(post.content);
  const text = stripHtml(post.content);
  return (
    <Link
      href={`/posts/${post.id}`}
      className={`mb-1 flex max-w-[16rem] flex-col overflow-hidden rounded-xl border ${
        onDark ? "border-white/25 bg-black/10" : "border-line bg-surface"
      }`}
    >
      <div className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold">
        <CharacterAvatar name={post.characters?.name ?? "?"} avatarUrl={post.characters?.avatar_url} size={20} />
        <span className="truncate">{post.characters?.username ?? post.characters?.name}</span>
      </div>
      {post.media_type === "video" && post.media_url ? (
        <div className="relative">
          <video src={`${post.media_url}#t=0.1`} preload="metadata" muted playsInline className="max-h-48 w-full object-cover" />
          <Play className="absolute right-2 top-2 h-5 w-5 fill-white text-white drop-shadow" strokeWidth={1.5} />
        </div>
      ) : thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" loading="lazy" className="max-h-48 w-full object-cover" />
      ) : null}
      {text && <p className="line-clamp-3 px-2.5 py-1.5 text-xs opacity-90">{text}</p>}
    </Link>
  );
}

function StoryReplyPreview({ story, onDark }: { story: NonNullable<Message["story"]>; onDark: boolean }) {
  const thumb = story.image_url;
  return (
    <div className="mb-1 flex items-center gap-2">
      <div
        className="relative h-16 w-9 shrink-0 overflow-hidden rounded-md"
        style={{ background: thumb || story.video_url ? "#000" : storyBackground(story.bg) }}
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : story.video_url ? (
          <video src={`${story.video_url}#t=0.1`} preload="metadata" muted playsInline className="h-full w-full object-cover" />
        ) : null}
      </div>
      <p className={`text-xs ${onDark ? "opacity-90" : "text-fg-soft"}`}>Antwort auf Story</p>
    </div>
  );
}

// Eine Chat-Nachricht: Antwort-Zitat, Bild, geteilter Beitrag, Story-Antwort, Reaktionen,
// Doppeltipp = Herz und Wischen nach rechts = Antworten (Handy).
export function MessageBubble({
  message,
  isOwn,
  activeCharacter,
  replyTarget,
  reactions,
  editing,
  editDraft,
  onEditDraft,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onReply,
}: {
  message: Message;
  isOwn: boolean;
  activeCharacter: Character;
  replyTarget?: Message;
  reactions: ReactionSummary[];
  editing: boolean;
  editDraft: string;
  onEditDraft: (value: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onReply: () => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number; active: boolean } | null>(null);
  const font = PROFILE_FONTS.find((f) => f.id === message.characters?.theme_font)?.family;
  const accent = message.characters?.theme_accent;

  function resetRow() {
    if (rowRef.current) {
      rowRef.current.style.transition = "transform 0.2s ease-out";
      rowRef.current.style.transform = "";
    }
  }

  return (
    <div
      ref={rowRef}
      className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""} ${message.pending ? "opacity-70" : ""}`}
      onTouchStart={(e) => {
        swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, active: false };
        if (rowRef.current) rowRef.current.style.transition = "";
      }}
      onTouchMove={(e) => {
        const s = swipe.current;
        if (!s || !rowRef.current) return;
        const dx = e.touches[0].clientX - s.x;
        const dy = e.touches[0].clientY - s.y;
        if (!s.active && (Math.abs(dy) > 14 || dx < 0)) {
          swipe.current = null;
          return;
        }
        if (dx > 10) s.active = true;
        if (s.active) rowRef.current.style.transform = `translateX(${Math.min(dx, 84) * 0.8}px)`;
      }}
      onTouchEnd={(e) => {
        const s = swipe.current;
        swipe.current = null;
        if (s?.active && e.changedTouches[0].clientX - s.x > SWIPE_TRIGGER) {
          navigator.vibrate?.(10);
          onReply();
        }
        resetRow();
      }}
    >
      <CharacterAvatar name={message.characters?.name ?? "?"} avatarUrl={message.characters?.avatar_url} size={28} />
      <DoubleTapLike
        likeKey={message.id}
        heartClassName="h-14 w-14"
        className={`group max-w-[78%] rounded-lg px-3 py-2 ${
          isOwn ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg"
        }`}
      >
        <div style={{ fontFamily: font }}>
          {!isOwn && accent && (
            <span aria-hidden className="absolute inset-y-2 left-0 w-[3px] rounded-full" style={{ background: accent }} />
          )}
          <div className="mb-0.5 flex items-center gap-1.5">
            <p className="text-xs">
              {message.characters?.name} · {formatDateTime(message.created_at)}
              {message.updated_at && " · bearbeitet"}
            </p>
            {!editing && !message.pending && (
              <span className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                <button type="button" onClick={onReply} title="Antworten" className="rounded p-0.5 hover:bg-black/10">
                  <CornerUpLeft className="h-3 w-3" strokeWidth={2} />
                </button>
                {isOwn && (
                  <>
                    <button type="button" onClick={onStartEdit} title="Bearbeiten" className="rounded p-0.5 hover:bg-black/10">
                      <Pencil className="h-3 w-3" strokeWidth={2} />
                    </button>
                    <button type="button" onClick={onDelete} title="Löschen" className="rounded p-0.5 hover:bg-black/10">
                      <Trash2 className="h-3 w-3" strokeWidth={2} />
                    </button>
                  </>
                )}
              </span>
            )}
          </div>

          {replyTarget && (
            <div className={`mb-1 rounded-md border-l-2 px-2 py-1 text-xs ${isOwn ? "border-white/60 bg-black/10" : "border-accent bg-black/5"}`}>
              <p className="font-semibold">{replyTarget.characters?.name}</p>
              <p className="line-clamp-2 opacity-90">{replyTarget.content || (replyTarget.image_url ? "Foto" : "Beitrag")}</p>
            </div>
          )}
          {message.story && <StoryReplyPreview story={message.story} onDark={isOwn} />}
          {message.shared_post && <SharedPostCard post={message.shared_post} onDark={isOwn} />}

          {editing ? (
            <div className="flex flex-col gap-1.5">
              <input
                type="text"
                value={editDraft}
                onChange={(e) => onEditDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSaveEdit();
                  if (e.key === "Escape") onCancelEdit();
                }}
                autoFocus
                className="rounded-md border border-line bg-app px-2 py-1 text-base text-fg outline-none focus:border-accent sm:text-sm"
              />
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={onSaveEdit} className="hover:underline">
                  Speichern
                </button>
                <button type="button" onClick={onCancelEdit} className="opacity-90 hover:underline">
                  Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <>
              {message.image_url && (
                <a href={message.image_url} target="_blank" rel="noreferrer" className="mb-1 block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={message.image_url} alt="Gesendetes Bild" className="max-h-72 max-w-full rounded-md object-cover" />
                </a>
              )}
              {message.content && <p className="whitespace-pre-line text-[15px] leading-relaxed">{message.content}</p>}
            </>
          )}
          {!editing && !message.pending && (
            <div className="mt-1.5">
              <ReactionBar
                onBubble
                target={{ messageId: message.id, characterId: activeCharacter.id }}
                initialReactions={reactions}
              />
            </div>
          )}
        </div>
      </DoubleTapLike>
    </div>
  );
}
