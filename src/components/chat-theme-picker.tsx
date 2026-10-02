"use client";

import { useEffect, useRef, useState } from "react";
import { Palette } from "lucide-react";
import { saveChatTheme } from "@/app/chat-theme-actions";
import { CHAT_THEME_PRESETS, EMPTY_CHAT_THEME, isChatThemeEmpty, type ChatKind, type ChatTheme } from "@/lib/chat-theme";

const FALLBACK: ChatTheme = { main: "#525871", accent: "#96565d", bg: "#fbf5f0" };

function ColorRow({
  label,
  hint,
  value,
  fallback,
  onChange,
}: {
  label: string;
  hint: string;
  value: string | null;
  fallback: string;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value ?? fallback}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="h-9 w-11 cursor-pointer rounded-md border border-line bg-surface p-1"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-fg">{label}</span>
        <span className="block text-[11px] text-muted">{hint}</span>
      </span>
      {value && (
        <button type="button" onClick={() => onChange(null)} className="text-xs text-muted hover:text-accent">
          Zurücksetzen
        </button>
      )}
    </div>
  );
}

// Eigene Chat-Farben (nur für dich sichtbar, pro Chat gespeichert).
export function ChatThemePicker({
  kind,
  chatId,
  theme,
  onChange,
  align = "right",
}: {
  kind: ChatKind;
  chatId: string;
  theme: ChatTheme;
  onChange: (theme: ChatTheme) => void;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function apply(next: ChatTheme, immediately = false) {
    onChange(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const run = async () => {
      const err = await saveChatTheme(kind, chatId, isChatThemeEmpty(next) ? null : next);
      setError(err);
    };
    if (immediately) void run();
    else saveTimer.current = setTimeout(run, 500);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="Chat-Farben"
        aria-label="Chat-Farben"
        className={`shrink-0 rounded-full p-1.5 transition hover:bg-surface-2 ${
          !isChatThemeEmpty(theme) ? "text-accent" : "text-muted hover:text-fg"
        }`}
      >
        <Palette className="h-4 w-4" strokeWidth={2} />
      </button>
      {open && (
        <div
          className={`absolute top-full z-50 mt-2 flex w-72 flex-col gap-3 rounded-2xl border border-line bg-surface p-4 text-fg shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <p className="text-sm font-medium text-fg">Chat-Farben</p>
          <div className="flex flex-wrap gap-1.5">
            {CHAT_THEME_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => apply(p.theme, true)}
                title={p.name}
                className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs text-fg-soft transition hover:border-accent"
              >
                <span
                  className="h-3.5 w-3.5 rounded-full border border-line"
                  style={{ background: `linear-gradient(135deg, ${p.theme.bg} 0 34%, ${p.theme.accent} 34% 67%, ${p.theme.main} 67%)` }}
                />
                {p.name}
              </button>
            ))}
          </div>
          <ColorRow
            label="Hauptfarbe"
            hint="Deine Sprechblasen und Senden-Knopf"
            value={theme.main}
            fallback={FALLBACK.main!}
            onChange={(v) => apply({ ...theme, main: v })}
          />
          <ColorRow
            label="Akzent"
            hint="Links und Hervorhebungen"
            value={theme.accent}
            fallback={FALLBACK.accent!}
            onChange={(v) => apply({ ...theme, accent: v })}
          />
          <ColorRow
            label="Hintergrund"
            hint="Fläche des Chats"
            value={theme.bg}
            fallback={FALLBACK.bg!}
            onChange={(v) => apply({ ...theme, bg: v })}
          />
          {!isChatThemeEmpty(theme) && (
            <button
              type="button"
              onClick={() => apply(EMPTY_CHAT_THEME, true)}
              className="self-start text-xs text-muted underline decoration-dotted hover:text-fg"
            >
              Auf Standard zurücksetzen
            </button>
          )}
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
