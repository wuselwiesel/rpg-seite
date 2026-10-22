"use client";

import { EmojiCatalog } from "./emoji-catalog";
import { isSendKey, useEnterSends } from "@/lib/send-pref";
import { useEffect, useRef, useState } from "react";
import { useEditor, useEditorState, EditorContent, type Editor, type Extensions } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { EyeOff } from "lucide-react";
import StarterKit from "@tiptap/starter-kit";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Mention from "@tiptap/extension-mention";
import { TextStyle, FontSize } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/image-resize";
import { createMentionSuggestion } from "@/lib/mention-suggestion";
import { wikiMentionExtension } from "@/lib/wiki-mention-suggestion";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { Details, DetailsContent, DetailsSummary } from "@tiptap/extension-details";
import { Callout } from "@/lib/tiptap-callout";
import { PdfFile } from "@/lib/tiptap-pdf";
import { Spoiler } from "@/lib/tiptap-spoiler";
import { BlockTools } from "@/components/editor-blocks";
import { SymbolPicker } from "./symbol-picker";
import { PROFILE_FONTS } from "@/lib/profile-theme";
import { loadDefaultFontId, saveDefaultFontId } from "@/lib/default-font";
import type { Character } from "@/lib/types";
import { UPLOAD_CACHE } from "@/lib/upload-cache";

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

// Schriftgröße für markierten Text (ohne Markierung für den nächsten getippten Text); „Normal“ nimmt die Größe wieder weg.
const FONT_SIZES = [
  { value: "13px", label: "Klein" },
  { value: "", label: "Normal" },
  { value: "20px", label: "Groß" },
  { value: "26px", label: "Sehr groß" },
  { value: "34px", label: "Riesig" },
];

function FontSizeSelect({ editor }: { editor: Editor }) {
  const current = useEditorState({
    editor,
    selector: ({ editor: ed }) => (ed.getAttributes("textStyle").fontSize as string | undefined) ?? "",
  });
  const known = FONT_SIZES.some((s) => s.value === current);
  return (
    <select
      aria-label="Schriftgröße"
      title="Schriftgröße"
      value={current}
      onChange={(e) => {
        const chain = editor.chain().focus();
        if (e.target.value) chain.setFontSize(e.target.value).run();
        else chain.unsetFontSize().run();
      }}
      className="h-8 shrink-0 rounded border border-line bg-surface px-1.5 text-sm text-fg-soft outline-none transition hover:text-fg focus:border-accent"
    >
      {!known && <option value={current}>{current}</option>}
      {FONT_SIZES.map((s) => (
        <option key={s.label} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

// Schwebende Leiste über (am Handy unter) markiertem Text: die wichtigsten Formate, ohne zur festen Leiste oben zurückzuscrollen.
function SelectionMenu({ editor, wikiPages }: { editor: Editor; wikiPages?: { id: string; title: string }[] }) {
  const [wikiOpen, setWikiOpen] = useState(false);
  const [wikiQuery, setWikiQuery] = useState("");
  // Am Handy erscheint über der Auswahl schon das Menü des Systems (Kopieren, Einfügen), deshalb dort darunter.
  const coarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  // Hervorhebung der aktiven Formate folgt der Auswahl.
  const on = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      bold: ed.isActive("bold"),
      italic: ed.isActive("italic"),
      underline: ed.isActive("underline"),
      strike: ed.isActive("strike"),
      spoiler: ed.isActive("spoiler"),
      h2: ed.isActive("heading", { level: 2 }),
      h3: ed.isActive("heading", { level: 3 }),
      list: ed.isActive("bulletList"),
      quote: ed.isActive("blockquote"),
      link: ed.isActive("link"),
    }),
  });

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

  function wrapInGuillemets() {
    const { from, to } = editor.state.selection;
    editor.chain().focus().insertContentAt(to, "«").insertContentAt(from, "»").run();
  }

  // Die Markierung wird zum Anzeigetext: [[Titel|markierter Text]], oder [[Text]], wenn beides gleich ist.
  function linkToWiki(title: string) {
    const { from, to } = editor.state.selection;
    const selected = editor.state.doc.textBetween(from, to, " ").trim();
    const token = selected && selected.toLowerCase() !== title.toLowerCase() ? `[[${title}|${selected}]]` : `[[${title}]]`;
    editor.chain().focus().insertContent(token).run();
    setWikiOpen(false);
    setWikiQuery("");
  }

  function toggleWiki() {
    const { from, to } = editor.state.selection;
    setWikiQuery(editor.state.doc.textBetween(from, to, " ").trim().slice(0, 60));
    setWikiOpen((v) => !v);
  }

  const wikiMatches = wikiPages?.filter((p) => p.title.toLowerCase().includes(wikiQuery.trim().toLowerCase())).slice(0, 6) ?? [];
  const wikiExact = !!wikiPages?.some((p) => p.title.toLowerCase() === wikiQuery.trim().toLowerCase());

  return (
    <BubbleMenu
      editor={editor}
      // Über Seitenleisten und Linien der Seite; waagerecht am Editor ausgerichtet, nicht an der ganzen Seite (sonst ragt die Leiste in die Seitenleiste)
      className="z-50"
      options={{ placement: coarse ? "bottom" : "top", offset: 8, shift: ({ elements }) => {
          // nur am Editor ausrichten, wenn die Leiste hineinpasst; ist der Editor schmaler, gilt wie bisher die ganze Seite
          const wrap = editor.view.dom.closest("[data-rte]");
          return { padding: 8, boundary: wrap && elements.floating.getBoundingClientRect().width <= wrap.getBoundingClientRect().width - 16 ? wrap : undefined };
        },
      }}
      shouldShow={({ editor: ed, state }) => ed.isEditable && !state.selection.empty && !ed.isActive("image")}
    >
      <div className="flex max-w-[calc(100vw-1rem)] flex-col gap-1">
      <div
        role="toolbar"
        aria-label="Formatierung der Auswahl"
        className="flex max-w-[calc(100vw-1rem)] items-center gap-0.5 overflow-x-auto rounded-lg border border-line bg-surface p-1 shadow-lg [&>button]:shrink-0 [&>button]:whitespace-nowrap"
        onMouseDown={(e) => {
          const tag = (e.target as HTMLElement).tagName;
          if (tag !== "INPUT" && tag !== "SELECT" && tag !== "OPTION") e.preventDefault();
        }}
      >
        <ToolbarButton label="Fett" active={on.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
          <strong>F</strong>
        </ToolbarButton>
        <ToolbarButton label="Kursiv" active={on.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <em>K</em>
        </ToolbarButton>
        <ToolbarButton label="Unterstrichen" active={on.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <span className="underline">U</span>
        </ToolbarButton>
        <ToolbarButton label="Durchgestrichen" active={on.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <span className="line-through">S</span>
        </ToolbarButton>
        <ToolbarButton label="Als Spoiler verbergen" active={on.spoiler} onClick={() => editor.chain().focus().toggleSpoiler().run()}>
          <EyeOff className="h-3.5 w-3.5" strokeWidth={2} />
        </ToolbarButton>
        <span className="mx-0.5 h-5 w-px bg-line" />
        <ToolbarButton label="Überschrift groß" active={on.h2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          H2
        </ToolbarButton>
        <ToolbarButton label="Überschrift klein" active={on.h3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          H3
        </ToolbarButton>
        <FontSizeSelect editor={editor} />
        <ToolbarButton label="Aufzählung" active={on.list} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          • Liste
        </ToolbarButton>
        <ToolbarButton label="Zitat" active={on.quote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          „Zitat“
        </ToolbarButton>
        <span className="mx-0.5 h-5 w-px bg-line" />
        <ToolbarButton label="Markierten Text in » « setzen" onClick={wrapInGuillemets}>
          »…«
        </ToolbarButton>
        <ToolbarButton label="Link" active={on.link} onClick={setLink}>
          🔗
        </ToolbarButton>
        {wikiPages && (
          <ToolbarButton label="Mit Wiki-Seite verlinken" active={wikiOpen} onClick={toggleWiki}>
            [[ ]]
          </ToolbarButton>
        )}
      </div>
      {wikiOpen && wikiPages && (
        <div
          role="group"
          aria-label="Wiki-Link einfügen"
          className="flex w-72 max-w-full flex-col gap-1 rounded-lg border border-line bg-surface p-1.5 shadow-lg"
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).tagName !== "INPUT") e.preventDefault();
          }}
        >
          <input
            autoFocus
            value={wikiQuery}
            onChange={(e) => setWikiQuery(e.target.value)}
            placeholder="Seite suchen"
            aria-label="Wiki-Seite suchen"
            className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent"
          />
          <ul className="flex max-h-44 flex-col overflow-y-auto">
            {wikiMatches.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => linkToWiki(p.title)} className="w-full rounded-md px-2 py-1.5 text-left text-sm text-fg transition hover:bg-surface-2">
                  {p.title}
                </button>
              </li>
            ))}
            {wikiQuery.trim() && !wikiExact && (
              <li>
                <button type="button" onClick={() => linkToWiki(wikiQuery.trim())} className="w-full rounded-md px-2 py-1.5 text-left text-sm text-accent transition hover:bg-surface-2">
                  „{wikiQuery.trim()}“ verlinken (Seite fehlt noch)
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
      </div>
    </BubbleMenu>
  );
}

function Toolbar({
  editor,
  allowFontSelection,
  allowBlocks,
  notesTools,
  wikiPages,
}: {
  editor: Editor;
  allowFontSelection?: boolean;
  allowBlocks?: boolean;
  notesTools?: boolean;
  wikiPages?: { id: string; title: string }[];
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [symbolsOpen, setSymbolsOpen] = useState(false);
  const [emojisOpen, setEmojisOpen] = useState(false);
  const [fontsOpen, setFontsOpen] = useState(false);
  const [wikiOpen, setWikiOpen] = useState(false);
  const [wikiQuery, setWikiQuery] = useState("");
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

  // Fügt [[Titel]] ein; ist Text markiert, wird er zum Anzeigetext: [[Titel|markierter Text]].
  function insertWikiLink(title: string) {
    const { from, to, empty } = editor.state.selection;
    const selected = empty ? "" : editor.state.doc.textBetween(from, to, " ").trim();
    const token = selected && selected.toLowerCase() !== title.toLowerCase() ? `[[${title}|${selected}]]` : `[[${title}]]`;
    editor.chain().focus().insertContent(token).run();
    setWikiOpen(false);
    setWikiQuery("");
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
      .upload(path, file, UPLOAD_CACHE);

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
        <ToolbarButton
          label="Als Spoiler verbergen"
          active={editor.isActive("spoiler")}
          onClick={() => editor.chain().focus().toggleSpoiler().run()}
        >
          <EyeOff className="h-3.5 w-3.5" strokeWidth={2} />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-line" />

        {notesTools && (
          <ToolbarButton label="Überschrift ganz groß" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
            H1
          </ToolbarButton>
        )}
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
        <FontSizeSelect editor={editor} />

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
        {notesTools && (
          <>
            <ToolbarButton label="Aufgabenliste" active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()}>
              ☑ Aufgaben
            </ToolbarButton>
            <ToolbarButton label="Markierstift" active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()}>
              🖍 Markieren
            </ToolbarButton>
            <ToolbarButton label="Code im Text" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
              {"`Code`"}
            </ToolbarButton>
            <ToolbarButton label="Code-Block" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
              {"</>"} Code
            </ToolbarButton>
          </>
        )}

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
        <ToolbarButton label="Emojis einfügen" active={emojisOpen} onClick={() => setEmojisOpen((v) => !v)}>
          😊
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

        {wikiPages && (
          <ToolbarButton label="Mit Wiki-Seite verlinken" active={wikiOpen} onClick={() => setWikiOpen((v) => !v)}>
            [[ ]]
          </ToolbarButton>
        )}
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
        <div className="overflow-hidden rounded-xl bg-surface-2" role="group" aria-label="Emojis">
          <EmojiCatalog
            height={320}
            onPick={(token) => {
              editor.chain().focus().insertContent(token.startsWith(":") ? `${token} ` : token).run();
            }}
          />
        </div>
      )}
      {allowBlocks && <BlockTools editor={editor} />}

      {wikiOpen && wikiPages && (
        <div className="flex flex-col gap-2 rounded-xl bg-surface-2 p-2" role="group" aria-label="Wiki-Link einfügen">
          <input
            autoFocus
            value={wikiQuery}
            onChange={(e) => setWikiQuery(e.target.value)}
            placeholder="Seite suchen oder neuen Titel eintippen"
            aria-label="Wiki-Seite suchen"
            className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-fg outline-none focus:border-accent"
          />
          <ul className="flex max-h-48 flex-col overflow-y-auto">
            {wikiPages
              .filter((p) => p.title.toLowerCase().includes(wikiQuery.trim().toLowerCase()))
              .slice(0, 30)
              .map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertWikiLink(p.title)}
                    className="w-full rounded-md px-2 py-1.5 text-left text-sm text-fg transition hover:bg-surface"
                  >
                    {p.title}
                  </button>
                </li>
              ))}
            {wikiQuery.trim() && !wikiPages.some((p) => p.title.toLowerCase() === wikiQuery.trim().toLowerCase()) && (
              <li>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertWikiLink(wikiQuery.trim())}
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm text-accent transition hover:bg-surface"
                >
                  „{wikiQuery.trim()}“ verlinken (Seite fehlt noch, roter Link)
                </button>
              </li>
            )}
          </ul>
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

// Die Bereinigung des gespeicherten HTML entfernt data-label; ohne den Namen zeigte ein bearbeiteter Text die ID statt „@Name“.
// Der Name steht aber noch im Text der Erwähnung („@Name“) und wird beim Einlesen daraus geholt.
const MentionKeepingName = Mention.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      label: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-label") || el.textContent?.replace(/^@/, "").trim() || null,
        renderHTML: (attrs: { label?: string | null }) => (attrs.label ? { "data-label": attrs.label } : {}),
      },
    };
  },
});

export function RichTextEditor({
  name,
  initialContent,
  placeholder,
  onChange,
  mentionCharacters,
  minHeight = 240,
  showToolbar = true,
  allowFontSelection = false,
  onSubmitKey,
  wikiPages,
  wikiCharacters,
  allowBlocks = false,
  notesTools = false,
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
  // Wenn gesetzt, schickt die Sende-Taste (Enter bzw. Strg/Cmd+Enter, siehe Einstellungen → Aussehen) den Text ab.
  onSubmitKey?: () => void;
  // Wiki-Seiten zum Verlinken: zeigt in der Werkzeugleiste die Auswahl für [[Titel]].
  wikiPages?: { id: string; title: string }[];
  // Charaktere der Welt: im Wiki mit @ erwähnen (neben den Seiten).
  wikiCharacters?: { id: string; name: string; avatar_url: string | null }[];
  // Textbausteine (Hinweis-Kasten, Spoiler, Tabelle): bisher nur im Wiki.
  allowBlocks?: boolean;
  // Notizen: Aufgabenlisten (Kästchen) und Code-Blöcke
  notesTools?: boolean;
}) {
  const [html, setHtml] = useState(initialContent ?? "");
  const enterSends = useEnterSends();
  const enterSendsRef = useRef(enterSends);
  const submitKeyRef = useRef(onSubmitKey);
  useEffect(() => {
    enterSendsRef.current = enterSends;
    submitKeyRef.current = onSubmitKey;
  });

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
      Spoiler,
      Link.configure({ openOnClick: false, autolink: true }),
      Image,
      Placeholder.configure({ placeholder: placeholder ?? "Schreib deine Geschichte..." }),
      TextStyle,
      FontSize,
      ...(allowFontSelection ? [FontFamily] : []),
      ...(notesTools ? [TaskList, TaskItem.configure({ nested: true }), Highlight] : []),
      ...(allowBlocks
        ? [Callout, PdfFile, Table.configure({ resizable: false }), TableRow, TableHeader, TableCell, Details, DetailsSummary, DetailsContent]
        : []),
      ...(mentionCharacters
        ? [
            MentionKeepingName.configure({
              HTMLAttributes: { class: "mention", "data-type": "mention" },
              suggestion: createMentionSuggestion(mentionCharacters),
            }),
          ]
        : wikiPages
          ? [
              // Erwähnungs-Knoten ohne eigene @-Auswahl: die gemeinsame Liste (Seiten und Figuren) kommt aus wikiMentionExtension.
              MentionKeepingName.extend({ addProseMirrorPlugins: () => [] }).configure({ HTMLAttributes: { class: "mention", "data-type": "mention" } }),
              wikiMentionExtension([
                ...wikiPages.map((p) => ({ ...p, kind: "page" as const })),
                ...(wikiCharacters ?? []).map((c) => ({ id: c.id, title: c.name, kind: "character" as const, avatarUrl: c.avatar_url })),
              ]),
            ]
          : []),
    ] satisfies Extensions,
    content: initialContent ?? "",
    editorProps: {
      handleKeyDown: (view, event) => {
        if (!submitKeyRef.current || !isSendKey(event, enterSendsRef.current)) return false;
        // Während die @-Auswahl offen ist, wählt Enter den Charakter; leerer Text wird nicht abgeschickt.
        if (document.querySelector("[data-mention-popup]")) return false;
        if (!view.state.doc.textContent.trim()) return false;
        event.preventDefault();
        submitKeyRef.current();
        return true;
      },
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
    <div data-rte className="rounded-md border border-line bg-surface focus-within:border-accent">
      <input type="hidden" name={name} value={html} />
      {editor && showToolbar && <Toolbar editor={editor} allowFontSelection={allowFontSelection} allowBlocks={allowBlocks} notesTools={notesTools} wikiPages={wikiPages} />}
      {editor && <SelectionMenu editor={editor} wikiPages={wikiPages} />}
      <EditorContent editor={editor} />
    </div>
  );
}
