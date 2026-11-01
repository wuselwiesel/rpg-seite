"use client";

import { useState } from "react";
import { AvatarUpload } from "@/components/avatar-upload";
import { IconPicker } from "@/components/icon-picker";
import { WikiPageIcon } from "@/components/wiki-page-icon";
import { pageIconSymbol, symbolToPageIcon } from "@/lib/wiki-page-icon";

// Icon einer Wiki-Seite: ein eigenes Bild hochladen oder ein vorhandenes Symbol (Bibliothek oder Emoji) wählen.
// Das Formular bekommt den Wert über das versteckte Feld „icon_url“.
export function PageIconField({ initial, displayName }: { initial?: string | null; displayName: string }) {
  const [value, setValue] = useState(initial ?? "");
  const [mode, setMode] = useState<"upload" | "symbol">(pageIconSymbol(initial) ? "symbol" : "upload");
  const symbol = pageIconSymbol(value);
  const tab = (on: boolean) => `rounded-full px-3 py-1 text-xs transition ${on ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:text-fg"}`;

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="icon_url" value={value} />
      <div className="flex gap-1.5" role="group" aria-label="Icon wählen oder hochladen">
        <button type="button" onClick={() => setMode("upload")} aria-pressed={mode === "upload"} className={tab(mode === "upload")}>
          Bild hochladen
        </button>
        <button type="button" onClick={() => setMode("symbol")} aria-pressed={mode === "symbol"} className={tab(mode === "symbol")}>
          Symbol wählen
        </button>
      </div>
      {mode === "upload" ? (
        <AvatarUpload
          // Neu einhängen, wenn ein Symbol gewählt war: sonst zeigt das Feld ein altes Bild
          key={symbol ? "symbol" : "upload"}
          name="icon_upload"
          initialUrl={symbol ? "" : value}
          displayName={displayName}
          bucket="wiki-covers"
          variant="icon"
          onChange={setValue}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span
              className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line"
              style={{ backgroundImage: "conic-gradient(var(--surface-2) 25%, var(--surface) 0 50%, var(--surface-2) 0 75%, var(--surface) 0)", backgroundSize: "16px 16px" }}
            >
              {value ? <WikiPageIcon value={value} className="h-full w-full p-1.5" lazy={false} /> : <span className="px-2 text-center text-xs text-muted">Kein Icon</span>}
            </span>
            {value && (
              <button type="button" onClick={() => setValue("")} className="text-sm text-muted hover:text-fg">
                Icon entfernen
              </button>
            )}
          </div>
          <IconPicker value={symbol ?? ""} onChange={(s) => setValue(symbolToPageIcon(s))} />
        </div>
      )}
    </div>
  );
}
