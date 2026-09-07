"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Speichert einen Formular-Entwurf debounced in localStorage und stellt ihn
// beim erneuten Öffnen der Seite wieder her (z.B. nach versehentlichem
// Schließen des Tabs). `restored` wird erst true, nachdem der gespeicherte
// Stand (falls vorhanden) geladen wurde - solange kann der Aufrufer z.B.
// einen Editor noch nicht rendern, um ihn nicht doppelt zu initialisieren.
export function useDraft<T extends Record<string, string>>(key: string, empty: T) {
  const [draft, setDraft] = useState<T>(empty);
  const [restored, setRestored] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const raw = localStorage.getItem(key);
        if (raw) setDraft({ ...empty, ...JSON.parse(raw) });
      } catch {
        // ignore
      }
      setRestored(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (patch: Partial<T>) => {
      setDraft((prev) => {
        const next = { ...prev, ...patch };
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        saveTimeout.current = setTimeout(() => {
          try {
            const hasContent = Object.values(next).some((v) => v.trim().length > 0);
            if (hasContent) {
              localStorage.setItem(key, JSON.stringify(next));
            } else {
              localStorage.removeItem(key);
            }
          } catch {
            // ignore
          }
        }, 400);
        return next;
      });
    },
    [key],
  );

  const clear = useCallback(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }, [key]);

  return { draft, restored, update, clear };
}
