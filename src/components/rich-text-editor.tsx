"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor, type Extensions } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Mention from "@tiptap/extension-mention";
import { createClient } from "@/lib/supabase/client";
import { createMentionSuggestion } from "@/lib/mention-suggestion";
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

function Toolbar({ editor }: { editor: Editor }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

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
}: {
  name: string;
  initialContent?: string;
  placeholder?: string;
  onChange?: (html: string) => void;
  mentionCharacters?: Character[];
  minHeight?: number;
  showToolbar?: boolean;
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
      {editor && showToolbar && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
