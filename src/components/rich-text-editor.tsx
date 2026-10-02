"use client";

import { useEmojiMap } from "./custom-emoji-provider";
import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor, type Extensions } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Mention from "@tiptap/extension-mention";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/image-resize";
import { createMentionSuggestion } from "@/lib/mention-suggestion";
import { SymbolPicker } from "./symbol-picker";
import { PROFILE_FONTS } from "@/lib/profile-theme";
import { loadDefaultFontId, saveDefaultFontId } from "@/lib/default-font";
import type { Character } from "@/lib/types";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`rounded px-2 py-1 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-30 ${
        active
          ? "bg-accent-strong text-on-accent-strong"
          : "text-fg-soft hover:bg-surface-2 hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, allowFontSelection }: { editor: Editor; allowFontSelection?: boolean }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [symbolsOpen, setSymbolsOpen] = useState(false);
  const [emojisOpen, setEmojisOpen] = useState(false);
  const emojiMap = useEmojiMap();
  const [fontsOpen, setFontsOpen] = useState(false);
  const [defaultFontId, setDefaultFontId] = useState<string | null>(loadDefaultFontId);

  // Ohne Markierung gilt die Wahl als Standard für neuen Text und wird gemerkt;
  // mit Markierung ändert sie nur den markierten Text.
  function pickFont(font: (typeof PROFILE_FONTS)[number] | null) {
    const chain = editor.chain().focus();
    if (font) chain.setFontFamily(font.family).run();
    else chain.unsetFontFamily().run();
    if (editor.state.selection.empty) {
      saveDefaultFontId(font?.id ?? null);
      setDefaultFontId(font?.id ?? null);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const original = e.target.files?.[0];
    e.target.value = "";
    if (!original) return;
    const file = await resizeImage(original);

    if (file.size > MAX_IMAGE_SIZE) {
      setError("Datei ist zu groß (max. 10 MB).");
      return;
    }

    setUploading(true);
    setError(null);

    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(path, file);

    setUploading(false);

    if (uploadError) {
      setError(uploadError.message);
      return;
    }

    const { data } = supabase.storage.from("post-images").getPublicUrl(path);
    editor.chain().focus().setImage({ src: data.publicUrl }).run();
  }

  function setLink() {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link-URL:", previousUrl ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  // Anführungszeichen » « (deutsche Rede): einzeln einfügen oder markierten Text damit umschließen.
  function wrapInGuillemets() {
    const { from, to, empty } = editor.state.selection;
    if (empty) {
      editor.chain().focus().insertContent("»«").setTextSelection(from + 1).run();
    } else {
      editor.chain().focus().insertContentAt(to, "«").insertContentAt(from, "»").run();
    }
  }

  return (
    <div className="flex flex-col gap-1 border-b border-line p-2">
      <div className="flex flex-wrap items-center gap-1">
        <ToolbarButton
          label="Fett"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <strong>F</strong>
        </ToolbarButton>
        <ToolbarButton
          label="Kursiv"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <em>K</em>
        </ToolbarButton>
        <ToolbarButton
          label="Unterstrichen"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <span className="underline">U</span>
        </ToolbarButton>
        <ToolbarButton
          label="Durchgestrichen"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <span className="line-through">S</span>
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-line" />

        <ToolbarButton
          label="Überschrift groß"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          label="Überschrift klein"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-line" />

        <ToolbarButton
          label="Aufzählung"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • Liste
        </ToolbarButton>
        <ToolbarButton
          label="Nummerierte Liste"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. Liste
        </ToolbarButton>
        <ToolbarButton
          label="Zitat"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          &ldquo;Zitat&rdquo;
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-line" />

        <ToolbarButton label="Anführungszeichen » einfügen" onClick={() => editor.chain().focus().insertContent("»").run()}>
          »
        </ToolbarButton>
        <ToolbarButton label="Anführungszeichen « einfügen" onClick={() => editor.chain().focus().insertContent("«").run()}>
          «
        </ToolbarButton>
        <ToolbarButton label="Markierten Text in » « setzen" onClick={wrapInGuillemets}>
          »…«
        </ToolbarButton>
        <ToolbarButton label="Eigene Emojis einfügen" active={emojisOpen} onClick={() => setEmojisOpen((v) => !v)}>
          🖼️
        </ToolbarButton>
        <ToolbarButton label="Symbole einfügen" active={symbolsOpen} onClick={() => setSymbolsOpen((v) => !v)}>
          ✦ Symbole
        </ToolbarButton>

        {allowFontSelection && (
          <>
            <span className="mx-1 h-5 w-px bg-line" />
            <ToolbarButton label="Schriftart wählen" active={fontsOpen} onClick={() => setFontsOpen((v) => !v)}>
              Aa Schriftart
            </ToolbarButton>
          </>
        )}

        <span className="mx-1 h-5 w-px bg-line" />

        <ToolbarButton label="Link" active={editor.isActive("link")} onClick={setLink}>
          🔗
        </ToolbarButton>
        <ToolbarButton
          label="Bild oder GIF einfügen"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? "…" : "🖼️"}
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-line" />

        <ToolbarButton
          label="Rückgängig"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          ↶
        </ToolbarButton>
        <ToolbarButton
          label="Wiederholen"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          ↷
        </ToolbarButton>
      </div>
      {emojisOpen && (
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-surface-2 p-2" role="group" aria-label="Eigene Emojis">
          {Object.keys(emojiMap).length === 0 ? (
            <p className="text-xs text-muted">
              Noch keine eigenen Emojis in dieser Welt. Lade sie unter Einstellungen → Eigene Emojis hoch.
            </p>
          ) : (
            Object.entries(emojiMap)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([name, url]) => (
                <button
                  key={name}
                  type="button"
                  title={`:${name}:`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => editor.chain().focus().insertContent(`:${name}: `).run()}
                  className="flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-surface"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`:${name}:`} className="h-7 w-7 object-contain" draggable={false} />
                </button>
              ))
          )}
        </div>
      )}
      {symbolsOpen && (
        <SymbolPicker
          onPick={(symbol) => editor.chain().focus().insertContent(symbol).run()}
          onClose={() => setSymbolsOpen(false)}
        />
      )}
      {fontsOpen && (
        <div className="flex flex-col gap-2 rounded-xl bg-surface-2 p-2" role="group" aria-label="Schriftarten">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted">
              Ohne Markierung: Standard für neuen Text (wird gemerkt). Mit Markierung: nur der markierte Text.
            </p>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setFontsOpen(false)}
              className="shrink-0 rounded-full px-2.5 py-1 text-xs text-muted transition hover:bg-surface hover:text-fg"
            >
              Schließen
            </button>
          </div>
          <div className="grid max-h-56 grid-cols-2 gap-1.5 overflow-y-auto sm:grid-cols-3">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pickFont(null)}
              className={`rounded-lg border px-2.5 py-2 text-left text-sm transition ${
                !defaultFontId ? "border-accent bg-accent/10 text-fg" : "border-line bg-surface text-fg-soft hover:text-fg"
              }`}
            >
              Standard
            </button>
            {PROFILE_FONTS.map((f) => (
              <button
                key={f.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickFont(f)}
                style={{ fontFamily: f.family }}
                className={`rounded-lg border px-2.5 py-2 text-left text-base transition ${
                  defaultFontId === f.id ? "border-accent bg-accent/10 text-fg" : "border-line bg-surface text-fg-soft hover:text-fg"
                }`}
              >
                <span className="block truncate">{f.name}</span>
                <span className="block truncate text-xs opacity-70">Der Mond steigt auf</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

export function RichTextEditor({
  name,
  initialContent,
  placeholder,
  onChange,
  mentionCharacters,
  minHeight = 240,
  showToolbar = true,
  allowFontSelection = false,
}: {
  name: string;
  initialContent?: string;
  placeholder?: string;
  onChange?: (html: string) => void;
  mentionCharacters?: Character[];
  minHeight?: number;
  showToolbar?: boolean;
  // Schriftart-Auswahl im Toolbar für markierten Text (wort-/buchstabengenau) - bewusst
  // nur dort aktiviert, wo es angefragt wurde (Feed-Posts), nicht überall, siehe Chat/Story.
  allowFontSelection?: boolean;
}) {
  const [html, setHtml] = useState(initialContent ?? "");

  // Gemerkte Standard-Schriftart auf neuen, leeren Text anwenden.
  function applyDefaultFont(ed: Editor) {
    if (!allowFontSelection || !ed.isEmpty) return;
    if (ed.state.storedMarks?.some((m) => m.type.name === "textStyle")) return;
    const font = PROFILE_FONTS.find((f) => f.id === loadDefaultFontId());
    if (font) ed.commands.setFontFamily(font.family);
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Image,
      Placeholder.configure({ placeholder: placeholder ?? "Schreib deine Geschichte..." }),
      ...(allowFontSelection ? [TextStyle, FontFamily] : []),
      ...(mentionCharacters
        ? [
            Mention.configure({
              HTMLAttributes: { class: "mention", "data-type": "mention" },
              suggestion: createMentionSuggestion(mentionCharacters),
            }),
          ]
        : []),
    ] satisfies Extensions,
    content: initialContent ?? "",
    editorProps: {
      attributes: {
        class: "post-content px-3 py-2 text-fg outline-none [&_p]:my-2 first:[&_p]:mt-0",
        style: `min-height: ${minHeight}px`,
      },
    },
    onCreate: ({ editor }) => applyDefaultFont(editor),
    onFocus: ({ editor }) => applyDefaultFont(editor),
    onSelectionUpdate: ({ editor }) => applyDefaultFont(editor),
    onUpdate: ({ editor }) => {
      applyDefaultFont(editor);
      const nextHtml = editor.getHTML();
      setHtml(nextHtml);
      onChange?.(nextHtml);
    },
  });

  useEffect(() => {
    return () => editor?.destroy();
  }, [editor]);

  return (
    <div className="rounded-md border border-line bg-surface focus-within:border-accent">
      <input type="hidden" name={name} value={html} />
      {editor && showToolbar && <Toolbar editor={editor} allowFontSelection={allowFontSelection} />}
      <EditorContent editor={editor} />
    </div>
  );
}
