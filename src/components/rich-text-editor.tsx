"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
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

// Zuletzt gewählte Schriftart (geräteweit, nicht pro Beitrag) - neue, leere Editoren starten
// damit automatisch, statt bei jedem neuen Beitrag/Kommentar/Story-Eintrag wieder bei "Standard".
const PREFERRED_FONT_KEY = "wortwinkel:preferred-font";

function getPreferredFontId(): string | null {
  try {
    return localStorage.getItem(PREFERRED_FONT_KEY);
  } catch {
    return null;
  }
}

function setPreferredFontId(id: string | null) {
  try {
    if (id) localStorage.setItem(PREFERRED_FONT_KEY, id);
    else localStorage.removeItem(PREFERRED_FONT_KEY);
  } catch {
    // ignore
  }
}

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
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const fontMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fontMenuOpen) return;
    function onDown(e: PointerEvent) {
      if (fontMenuRef.current && !fontMenuRef.current.contains(e.target as Node)) setFontMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFontMenuOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [fontMenuOpen]);

  function pickFont(font: (typeof PROFILE_FONTS)[number] | null) {
    if (font) {
      editor.chain().focus().setFontFamily(font.family).run();
      setPreferredFontId(font.id);
    } else {
      editor.chain().focus().unsetFontFamily().run();
      setPreferredFontId(null);
    }
    setFontMenuOpen(false);
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
        <ToolbarButton label="Symbole einfügen" active={symbolsOpen} onClick={() => setSymbolsOpen((v) => !v)}>
          ✦ Symbole
        </ToolbarButton>

        {allowFontSelection && (
          <>
            <span className="mx-1 h-5 w-px bg-line" />
            <div className="relative" ref={fontMenuRef}>
              <button
                type="button"
                onClick={() => setFontMenuOpen((v) => !v)}
                aria-expanded={fontMenuOpen}
                aria-label="Schriftart für die Auswahl setzen"
                title="Schriftart für die Auswahl setzen - markiere Text (auch einzelne Wörter/Buchstaben) und wähle eine Schrift"
                className="flex items-center gap-1 rounded border border-line bg-surface px-1.5 py-1 text-xs text-fg-soft outline-none hover:text-fg focus:border-accent"
              >
                {(() => {
                  const active = PROFILE_FONTS.find((f) => editor.isActive("textStyle", { fontFamily: f.family }));
                  return (
                    <span className="max-w-[7rem] truncate" style={active ? { fontFamily: active.family } : undefined}>
                      {active?.name ?? "Schriftart…"}
                    </span>
                  );
                })()}
                <ChevronDown className="h-3 w-3 shrink-0" strokeWidth={2} />
              </button>
              {fontMenuOpen && (
                <div
                  role="listbox"
                  className="absolute left-0 top-full z-30 mt-1 max-h-60 w-48 overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-lg"
                >
                  <button
                    type="button"
                    onClick={() => pickFont(null)}
                    className="block w-full rounded px-2 py-1.5 text-left text-sm text-fg-soft hover:bg-surface-2 hover:text-fg"
                  >
                    Standard
                  </button>
                  {PROFILE_FONTS.map((f) => {
                    const active = editor.isActive("textStyle", { fontFamily: f.family });
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => pickFont(f)}
                        style={{ fontFamily: f.family }}
                        className={`block w-full rounded px-2 py-1.5 text-left text-base transition ${
                          active ? "bg-accent-strong text-on-accent-strong" : "text-fg hover:bg-surface-2"
                        }`}
                      >
                        {f.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
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
  const [, setRerenderTick] = useState(0);

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
    // Neuer, leerer Editor: zuletzt gewählte Schriftart automatisch übernehmen, statt bei jedem
    // Beitrag/Kommentar/Story-Eintrag erneut "Standard" zu zeigen. Bei vorhandenem Inhalt (z.B.
    // beim Bearbeiten) bleibt dessen eigene Formatierung unangetastet.
    onCreate: ({ editor }) => {
      if (!allowFontSelection || initialContent) return;
      const preferredId = getPreferredFontId();
      const font = preferredId && PROFILE_FONTS.find((f) => f.id === preferredId);
      if (font) {
        editor.chain().setFontFamily(font.family).run();
        // Ist die Toolbar von Anfang an sichtbar (z.B. Feed/Redaktion, anders als im eingeklappten
        // Story-Editor), bekäme sie von dieser allerersten Transaktion sonst nichts mit, weil Tiptaps
        // eigenes Update-Abo erst nach dem ersten Render zu laufen beginnt - deshalb hier zusätzlich
        // einen echten React-Rerender erzwingen, damit die Schriftart-Anzeige sofort stimmt.
        setRerenderTick((t) => t + 1);
      }
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
