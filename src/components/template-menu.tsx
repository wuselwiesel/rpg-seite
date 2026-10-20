"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, FileText } from "lucide-react";
import { createNoteFromTemplate, loadTemplateChoices } from "@/app/notizen/actions";
import { BUILTIN_TEMPLATES } from "@/lib/note-templates";
import type { LinkKind } from "@/lib/notes";

// „Aus Vorlage“: eigene und mitgelieferte Vorlagen; legt eine neue Notiz an und öffnet sie
export function TemplateMenu({ folderId = null, link, className = "" }: { folderId?: string | null; link?: { kind: LinkKind; id: string }; className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [own, setOwn] = useState<{ id: string; title: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void loadTemplateChoices().then((r) => {
      if (!cancelled) setOwn(r);
    });
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => {
      cancelled = true;
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  function create(input: { templateId?: string; builtinId?: string }) {
    setError(null);
    start(async () => {
      const r = await createNoteFromTemplate({ ...input, folderId, link });
      if (r.error || !r.id) return setError(r.error ?? "Konnte nicht angelegt werden.");
      setOpen(false);
      router.push(`/notizen/${r.id}`);
    });
  }

  const item = "block w-full truncate rounded-lg px-3 py-2 text-left text-sm text-fg transition hover:bg-surface-2 disabled:opacity-50";
  return (
    <div className={`relative ${className}`} ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-sm font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg">
        <FileText className="h-4 w-4" strokeWidth={2} />
        Aus Vorlage
        <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-2 w-64 rounded-2xl border border-line bg-surface p-2 shadow-lg">
          {own && own.length > 0 && (
            <>
              <p className="px-3 pb-1 pt-1 text-xs text-muted">Meine Vorlagen</p>
              {own.map((t) => (
                <button key={t.id} type="button" role="menuitem" disabled={pending} onClick={() => create({ templateId: t.id })} className={item}>
                  {t.title}
                </button>
              ))}
            </>
          )}
          <p className="px-3 pb-1 pt-2 text-xs text-muted">Vorschläge</p>
          {BUILTIN_TEMPLATES.map((t) => (
            <button key={t.id} type="button" role="menuitem" disabled={pending} onClick={() => create({ builtinId: t.id })} className={item}>
              {t.title}
            </button>
          ))}
          {error && <p className="px-3 py-1 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
