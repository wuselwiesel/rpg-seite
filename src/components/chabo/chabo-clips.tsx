"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Bookmark, Download, FolderPlus, MessageSquareQuote, Pencil, Printer, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EmojiHtml } from "@/components/custom-emoji-provider";
import { clipJumpHref, type Clip } from "@/lib/clips";
import { formatDateTime } from "@/lib/format";
import { createClipCollection, deleteClip, publishClipToWiki, deleteClipCollection, removeClipFromCollection, renameClipCollection, shareClipToSceneChat, updateClip } from "@/app/story/clip-actions";

type Collection = { id: string; name: string; clips: Clip[] };

type Row = {
  id: string;
  name: string;
  position: number;
  clip_collection_items: { position: number; scene_clips: Clip | null }[];
};

const card = "flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 @xl:p-8 @4xl:gap-4 @4xl:p-6";
// Symbole oben rechts: mit Maus erst beim Darüberfahren, am Handy erst, wenn der Eintrag angetippt (aufgeklappt) ist
const REVEAL_C =
  "absolute right-2 top-2 flex items-center gap-0.5 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/c:opacity-100 [@media(hover:hover)]:focus-within:opacity-100 [@media(hover:none)]:pointer-events-none [@media(hover:none)]:opacity-0 [@media(hover:none)]:group-data-[open]/c:pointer-events-auto [@media(hover:none)]:group-data-[open]/c:opacity-100";
const REVEAL_K =
  "absolute right-1.5 top-1.5 flex items-center gap-0.5 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/k:opacity-100 [@media(hover:hover)]:focus-within:opacity-100 [@media(hover:none)]:pointer-events-none [@media(hover:none)]:opacity-0 [@media(hover:none)]:group-data-[open]/k:pointer-events-auto [@media(hover:none)]:group-data-[open]/k:opacity-100";
const iconBtn = "flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg";

// „Wichtige Momente“ im ChaBo: eigene Sammlungen mit gespeicherten Ausschnitten aus Szenen (privat, nur für die Besitzer:in).
export function ChaboClips({ characterId }: { characterId: string }) {
  const [collections, setCollections] = useState<Collection[] | null>(null);
  const [newName, setNewName] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // Beim Ändern zählt der Zähler hoch und lädt die Sammlungen neu
  const [reload, setReload] = useState(0);
  const load = useCallback(() => setReload((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("clip_collections")
      .select("id, name, position, clip_collection_items(position, scene_clips(id, title, note, scene_title, story_post_id, items, created_at, wiki_page_id))")
      .eq("character_id", characterId)
      .order("position", { ascending: true })
      .returns<Row[]>()
      .then(({ data }) => {
        if (cancelled) return;
        setCollections(
          (data ?? []).map((c) => ({
            id: c.id,
            name: c.name,
            clips: [...c.clip_collection_items]
              .sort((x, y) => x.position - y.position)
              .map((i) => i.scene_clips)
              .filter((x): x is Clip => !!x),
          })),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [characterId, reload]);

  async function run(action: Promise<string | null>, okText?: string) {
    const error = await action;
    setMessage(error ? { ok: false, text: error } : okText ? { ok: true, text: okText } : null);
    if (!error) load();
  }

  if (collections === null) return null;

  return (
    <section aria-label="Wichtige Momente" className={card}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-serif text-xl text-fg">
          <Bookmark className="h-4 w-4 text-muted" strokeWidth={2} />
          Wichtige Momente
        </h2>
        <button type="button" onClick={() => setNewName("")} title="Neue Sammlung" aria-label="Neue Sammlung" className={iconBtn}>
          <FolderPlus className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {newName !== null && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(createClipCollection(characterId, newName)).then(() => setNewName(null));
          }}
          className="flex gap-2"
        >
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={60}
            placeholder="Name der Sammlung"
            aria-label="Name der Sammlung"
            className="min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent sm:text-sm"
          />
          <button type="submit" disabled={!newName.trim()} className="rounded-md bg-accent-strong px-3 py-2 text-sm font-medium text-on-accent-strong disabled:bg-surface-2 disabled:text-muted">
            Anlegen
          </button>
          <button type="button" onClick={() => setNewName(null)} aria-label="Abbrechen" className={iconBtn}>
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </form>
      )}

      {message && (
        <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {message.text}
        </p>
      )}

      {collections.length === 0 ? (
        <p className="text-sm text-muted">Noch keine Ausschnitte.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {collections.map((c) => (
            <Disclosure
              key={c.id}
              group="c"
              defaultOpen={collections.length === 1}
              className="rounded-xl border border-line px-4 py-3"
              head={
                <span className="text-sm font-medium text-fg">
                  {c.name} <span className="text-xs font-normal text-muted">{c.clips.length}</span>
                </span>
              }
              actions={
              <>
                <a href={`/ausschnitte/export?sammlung=${c.id}`} download title="Als Text speichern" aria-label="Als Text speichern" className={iconBtn}>
                  <Download className="h-4 w-4" strokeWidth={2} />
                </a>
                <a href={`/ausschnitte/druck?sammlung=${c.id}`} target="_blank" rel="noreferrer" title="Als PDF speichern" aria-label="Als PDF speichern" className={iconBtn}>
                  <Printer className="h-4 w-4" strokeWidth={2} />
                </a>
                <button
                  type="button"
                  title="Sammlung umbenennen"
                  aria-label="Sammlung umbenennen"
                  className={iconBtn}
                  onClick={() => {
                    const name = window.prompt("Neuer Name der Sammlung", c.name);
                    if (name !== null) void run(renameClipCollection(c.id, name));
                  }}
                >
                  <Pencil className="h-4 w-4" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  title="Sammlung löschen"
                  aria-label="Sammlung löschen"
                  className={`${iconBtn} hover:text-red-500`}
                  onClick={() => {
                    if (window.confirm(`Sammlung „${c.name}“ löschen? Ausschnitte, die in keiner anderen Sammlung liegen, werden mitgelöscht.`)) void run(deleteClipCollection(c.id));
                  }}
                >
                  <Trash2 className="h-4 w-4" strokeWidth={2} />
                </button>
              </>
              }
            >
              {c.clips.length === 0 ? (
                <p className="mt-2 text-sm text-muted">Noch keine Ausschnitte.</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-2">
                  {c.clips.map((clip) => (
                    <li key={clip.id}>
                      <ClipView
                        clip={clip}
                        onRemove={() => void run(removeClipFromCollection(c.id, clip.id))}
                        onDelete={() => {
                          if (window.confirm(`„${clip.title}“ aus allen Sammlungen löschen?`)) void run(deleteClip(clip.id));
                        }}
                        onEdit={() => {
                          const title = window.prompt("Titel", clip.title);
                          if (title === null) return;
                          const note = window.prompt("Notiz", clip.note ?? "");
                          if (note === null) return;
                          void run(updateClip(clip.id, title, note));
                        }}
                        onShare={() => void run(shareClipToSceneChat(clip.id), "Im Chat der Szene geteilt.")}
                        onWiki={() => {
                          if (!window.confirm(`„${clip.title}“ im Wiki für alle in der Welt zeigen?`)) return;
                          void run(publishClipToWiki(clip.id).then((r) => ("error" in r ? r.error : null)), "Im Wiki für alle gezeigt.");
                        }}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </Disclosure>
          ))}
        </div>
      )}
    </section>
  );
}

function ClipView({ clip, onRemove, onDelete, onEdit, onShare, onWiki }: { clip: Clip; onRemove: () => void; onDelete: () => void; onEdit: () => void; onShare: () => void; onWiki: () => void }) {
  return (
    <Disclosure
      group="k"
      className="rounded-lg bg-surface-2 px-3 py-2"
      head={
        <>
          <span className="text-sm font-medium text-fg">{clip.title}</span>
          {clip.scene_title && <span className="ml-2 text-xs text-muted">{clip.scene_title}</span>}
        </>
      }
      actions={
        <>
          {clip.story_post_id && (
            <button type="button" onClick={onShare} title="Im Chat der Szene teilen" aria-label="Im Chat der Szene teilen" className={iconBtn}>
              <MessageSquareQuote className="h-4 w-4" strokeWidth={2} />
            </button>
          )}
          {clip.story_post_id && !clip.wiki_page_id && (
            <button type="button" onClick={onWiki} title="Im Wiki für alle zeigen" aria-label="Im Wiki für alle zeigen" className={iconBtn}>
              <BookOpen className="h-4 w-4" strokeWidth={2} />
            </button>
          )}
          <button type="button" onClick={onEdit} title="Titel und Notiz ändern" aria-label="Titel und Notiz ändern" className={iconBtn}>
            <Pencil className="h-4 w-4" strokeWidth={2} />
          </button>
          <button type="button" onClick={onRemove} title="Aus dieser Sammlung entfernen" aria-label="Aus dieser Sammlung entfernen" className={iconBtn}>
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
          <button type="button" onClick={onDelete} title="Ausschnitt löschen" aria-label="Ausschnitt löschen" className={`${iconBtn} hover:text-red-500`}>
            <Trash2 className="h-4 w-4" strokeWidth={2} />
          </button>
        </>
      }
    >
      {clip.note && <p className="mt-2 whitespace-pre-wrap text-sm italic text-fg-soft">{clip.note}</p>}
      <div className="mt-2 flex flex-col gap-2">
        {clip.items.map((item) => (
          <div key={item.id} className="rounded-lg border border-line bg-surface px-3 py-2">
            <p className="text-xs text-muted">
              <span className="font-medium text-fg">{item.author}</span> · {formatDateTime(item.at)}
            </p>
            <EmojiHtml className="post-content mt-1 text-sm text-fg-soft" html={item.html} />
          </div>
        ))}
      </div>
      {clip.wiki_page_id && (
        <Link href={`/wiki/${clip.wiki_page_id}`} className="mr-1 mt-2 inline-block rounded-full px-3 py-1 text-sm text-accent transition hover:bg-surface">
          Im Wiki
        </Link>
      )}
      {clip.story_post_id && (
        <Link href={clipJumpHref(clip.story_post_id, clip.items.map((i) => i.id))} className="mt-2 inline-block rounded-full px-3 py-1 text-sm text-accent transition hover:bg-surface">
          Zur Szene
        </Link>
      )}
    </Disclosure>
  );
}

// Auf- und zuklappbarer Eintrag; die Symbole sitzen oben rechts (siehe REVEAL_C/REVEAL_K)
function Disclosure({
  group,
  head,
  actions,
  className,
  defaultOpen = false,
  children,
}: {
  group: "c" | "k";
  head: React.ReactNode;
  actions: React.ReactNode;
  className: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div data-open={open ? "" : undefined} className={`${group === "c" ? "group/c" : "group/k"} relative ${className}`}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className={`block w-full cursor-pointer text-left pr-36`}>
        {head}
      </button>
      <div className={group === "c" ? REVEAL_C : REVEAL_K}>{actions}</div>
      {open && children}
    </div>
  );
}
