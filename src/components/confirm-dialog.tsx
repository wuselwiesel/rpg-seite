"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type ConfirmOptions = {
  message: string;
  // Beschriftung des Bestätigen-Knopfs; benennt die Handlung („Entfernen“, „Löschen“), nicht „OK“
  confirmLabel: string;
  // Zerstörerische Handlung: Knopf in Warnfarbe, Fokus zunächst auf „Abbrechen“
  danger?: boolean;
  // Nur ein Hinweis (z. B. Fehlermeldung): kein „Abbrechen“, nur ein Knopf
  notice?: boolean;
};

// Eigener Bestätigungsdialog statt window.confirm: sieht überall gleich aus, lässt sich am Handy nicht aus Versehen wegtippen
// und benennt die Handlung auf dem Knopf. Aufruf: `const { confirm, dialog } = useConfirm();` … `if (!(await confirm({...}))) return;`
// und `{dialog}` einmal im JSX der Komponente rendern.
export function useConfirm(): { confirm: (options: ConfirmOptions) => Promise<boolean>; dialog: ReactNode } {
  const [pending, setPending] = useState<{ options: ConfirmOptions; resolve: (ok: boolean) => void } | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setPending({ options, resolve });
      }),
    [],
  );

  const answer = useCallback(
    (ok: boolean) => {
      pending?.resolve(ok);
      setPending(null);
    },
    [pending],
  );

  const dialog = pending ? <ConfirmDialog options={pending.options} onAnswer={answer} /> : null;
  return { confirm, dialog };
}

function ConfirmDialog({ options, onAnswer }: { options: ConfirmOptions; onAnswer: (ok: boolean) => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const okRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Portal erst nach dem Einhängen im Browser
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    (options.danger ? cancelRef.current : okRef.current)?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onAnswer(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mounted, options.danger, onAnswer]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50 p-3 sm:items-center"
      onClick={() => onAnswer(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={options.message}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl"
      >
        <p className="mb-5 text-[15px] leading-relaxed text-fg">{options.message}</p>
        <div className="flex justify-end gap-2">
          {!options.notice && (
            <button
              ref={cancelRef}
              type="button"
              onClick={() => onAnswer(false)}
              className="rounded-md border border-line px-4 py-2 text-sm text-fg-soft transition hover:bg-surface-2"
            >
              Abbrechen
            </button>
          )}
          <button
            ref={okRef}
            type="button"
            onClick={() => onAnswer(true)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition hover:opacity-90 ${
              options.danger ? "bg-red-600 text-white" : "bg-accent-strong text-on-accent-strong"
            }`}
          >
            {options.confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// Globale Variante ohne eigenen Zustand je Komponente: `await confirmDialog({...})` genügt, einmal im Layout hängt der <ConfirmHost />.
// Läuft der Host (noch) nicht, fällt es auf das Browser-Fenster zurück.
type Request = { options: ConfirmOptions; resolve: (ok: boolean) => void };
let hostOpen: ((request: Request) => void) | null = null;

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  if (!hostOpen) {
    if (typeof window === "undefined") return Promise.resolve(false);
    if (options.notice) {
      window.alert(options.message);
      return Promise.resolve(true);
    }
    return Promise.resolve(window.confirm(options.message));
  }
  return new Promise<boolean>((resolve) => hostOpen!({ options, resolve }));
}

// Fehler- und Hinweismeldungen im Stil der App statt window.alert: `void alertDialog(error)`
export function alertDialog(message: string): Promise<boolean> {
  return confirmDialog({ message, confirmLabel: "OK", notice: true });
}

export function ConfirmHost() {
  const [request, setRequest] = useState<Request | null>(null);

  useEffect(() => {
    hostOpen = (next) => {
      // Es ist immer nur eine Rückfrage offen: eine zweite gilt als abgelehnt
      setRequest((current) => {
        if (current) {
          next.resolve(false);
          return current;
        }
        return next;
      });
    };
    return () => {
      hostOpen = null;
    };
  }, []);

  if (!request) return null;
  return (
    <ConfirmDialog
      options={request.options}
      onAnswer={(ok) => {
        request.resolve(ok);
        setRequest(null);
      }}
    />
  );
}
