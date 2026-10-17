"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { MAX_TICKET_IMAGES, signTicketImages } from "@/lib/ticket-upload";

// Screenshots auswählen (noch nicht hochgeladen); die Eltern-Komponente lädt beim Absenden hoch
export function ImagePicker({ files, onChange, compact = false }: { files: File[]; onChange: (files: File[]) => void; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {files.map((f, i) => (
        <span key={`${f.name}-${i}`} className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urls[i]} alt="" className="h-16 w-16 rounded-lg border border-line object-cover" />
          <button
            type="button"
            aria-label="Bild entfernen"
            onClick={() => onChange(files.filter((_, j) => j !== i))}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-surface-3 text-fg shadow"
          >
            <X className="h-3 w-3" strokeWidth={2.5} />
          </button>
        </span>
      ))}
      {files.length < MAX_TICKET_IMAGES && (
        <button
          type="button"
          onClick={() => input.current?.click()}
          aria-label="Bild hinzufügen"
          className={`flex items-center justify-center text-muted transition hover:text-accent ${compact ? "h-8 w-8 rounded-full hover:bg-surface-2" : "h-16 w-16 rounded-lg border border-dashed border-line hover:border-accent"}`}
        >
          <ImagePlus className="h-5 w-5" strokeWidth={2} />
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
          e.target.value = "";
          onChange([...files, ...picked].slice(0, MAX_TICKET_IMAGES));
        }}
      />
    </div>
  );
}

// Bilder einer Meldung oder eines Kommentars: signierte Links werden beim Anzeigen geholt
export function TicketImages({ paths }: { paths: string[] }) {
  const key = paths.join("|");
  const [signed, setSigned] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    void signTicketImages(paths).then((m) => alive && setSigned(m));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (paths.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {paths.map((p) =>
        signed[p] ? (
          <a key={p} href={signed[p]} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={signed[p]} alt="Screenshot" className="max-h-44 max-w-full rounded-lg border border-line object-contain" />
          </a>
        ) : (
          <span key={p} className="h-24 w-32 animate-pulse rounded-lg bg-surface-2" />
        ),
      )}
    </div>
  );
}
