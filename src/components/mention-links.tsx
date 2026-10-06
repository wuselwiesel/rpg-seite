"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Erwähnte Charaktere (@Name) in Beiträgen, Szenen, Kommentaren usw. führen per Klick zum Profil.
// Gespeichert sind sie als <span data-type="mention" data-id="…">; eine Weiche für die ganze Seite,
// im Editor selbst (Text bearbeiten) gibt es keinen Sprung.
export function MentionLinks() {
  const router = useRouter();
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const el = (e.target as Element | null)?.closest?.('span[data-type="mention"][data-id]');
      if (!el || el.closest(".ProseMirror") || el.closest("a")) return;
      // In einem noch verborgenen Spoiler deckt der Klick erst auf
      const spoiler = el.closest('span[data-type="spoiler"]');
      if (spoiler && !spoiler.classList.contains("spoiler-open")) return;
      const id = el.getAttribute("data-id");
      if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return;
      e.preventDefault();
      const href = `/characters/${id}`;
      if (e.metaKey || e.ctrlKey || e.button === 1) window.open(href, "_blank", "noopener");
      else router.push(href);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [router]);
  return null;
}
