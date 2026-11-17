"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveWikiTocDefault } from "../home-actions";
import { TocDefaultEditor } from "../toc-settings";
import { isDefaultToc, tocDefaultsOnly, type WikiToc } from "@/lib/wiki-toc";

// Standard-Inhaltsverzeichnis der Welt (nur Besitzer:in und Admins). Gilt für alle Seiten, die weder eine eigene Einstellung noch einen Standard ihrer Art haben.
export function TocDefaultManager({ worldId, initial }: { worldId: string; initial: WikiToc | null }) {
  const router = useRouter();
  const [value, setValue] = useState<WikiToc | null>(initial);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const changed = JSON.stringify(value === null || isDefaultToc(tocDefaultsOnly(value)) ? null : tocDefaultsOnly(value)) !== JSON.stringify(initial);

  function save() {
    setMessage(null);
    startTransition(async () => {
      const error = await saveWikiTocDefault(worldId, JSON.stringify(value));
      if (error) return setMessage({ ok: false, text: error });
      setMessage({ ok: true, text: "Gespeichert." });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
      <TocDefaultEditor
        value={value}
        onChange={(v) => {
          setValue(v);
          setMessage(null);
        }}
        idPrefix="tocw"
      />
      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={pending || !changed} className="rounded-lg bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50">
          {pending ? "Speichere …" : "Speichern"}
        </button>
        {message && (
          <p role="status" className={`text-sm ${message.ok ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
