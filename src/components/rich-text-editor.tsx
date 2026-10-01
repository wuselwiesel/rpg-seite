"use client";

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
        <ToolbarButton label="Symbole einfügen" active={symbolsOpen} onClick={() => setSymbolsOpen((v) => !v)}>
          ✦ Symbole
        </ToolbarButton>

        {allowFontSelection && (
          <>
            <span className="mx-1 h-5 w-px bg-line" />
            <select
              aria-label="Schriftart für die Auswahl setzen"
              title="Schriftart für die Auswahl setzen - markiere Text (auch einzelne Wörter/Buchstaben) und wähle eine Schrift"
              value={PROFILE_FONTS.find((f) => editor.isActive("textStyle", { fontFamily: f.family }))?.id ?? ""}
              onChange={(e) => {
                const font = PROFILE_FONTS.find((f) => f.id === e.target.value);
                if (font) editor.chain().focus().setFontFamily(font.family).run();
                else editor.chain().focus().unsetFontFamily().run();
                e.currentTarget.blur();
              }}
              className="rounded border border-line bg-surface px-1.5 py-1 text-xs text-fg-soft outline-none focus:border-accent"
            >
              <option value="">Schriftart…</option>
              {PROFILE_FONTS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
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
      {symbolsOpen && (
        <SymbolPicker
          onPick={(symbol) => editor.chain().focus().insertContent(symbol).run()}
          onClose={() => setSymbolsOpen(false)}
        />
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
    onUpdate: ({ editor }) => {
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
