"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Preview = { href: string; title: string; category: string; excerpt: string; x: number; y: number; below: boolean };

// Zeigt für Wiki-Links im Text (a.wiki-link) eine Vorschau: am Desktop beim Darüberfahren,
// am Handy beim ersten Antippen (ein zweites Antippen öffnet den Eintrag).
export function WikiPreviewLayer() {
  const [preview, setPreview] = useState<Preview | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerType = useRef("mouse");
  const currentHref = useRef<string | null>(null);

  useEffect(() => {
    currentHref.current = preview?.href ?? null;
  }, [preview]);

  useEffect(() => {
    function link(target: EventTarget | null): HTMLAnchorElement | null {
      return target instanceof Element ? (target.closest("a.wiki-link") as HTMLAnchorElement | null) : null;
    }
    function open(a: HTMLAnchorElement) {
      const rect = a.getBoundingClientRect();
      const width = 288;
      const x = Math.min(Math.max(8, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 8);
      const below = rect.bottom + 170 < window.innerHeight;
      setPreview({
        href: a.getAttribute("href") ?? "#",
        title: a.dataset.wikiTitle ?? a.textContent ?? "",
        category: a.dataset.wikiCat ?? "Wiki",
        excerpt: a.dataset.wikiExcerpt ?? "",
        x,
        y: below ? rect.bottom + 6 : rect.top - 6,
        below,
      });
    }
    function cancelHide() {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    }
    function scheduleHide() {
      cancelHide();
      hideTimer.current = setTimeout(() => setPreview(null), 250);
    }

    function onPointerDown(e: PointerEvent) {
      pointerType.current = e.pointerType;
      if (!(e.target instanceof Element) || !e.target.closest("a.wiki-link, [data-wiki-preview]")) setPreview(null);
    }
    function onOver(e: PointerEvent) {
      if (e.pointerType !== "mouse") return;
      const a = link(e.target);
      if (!a) return;
      cancelHide();
      if (showTimer.current) clearTimeout(showTimer.current);
      showTimer.current = setTimeout(() => open(a), 180);
    }
    function onOut(e: PointerEvent) {
      if (e.pointerType !== "mouse" || !link(e.target)) return;
      if (showTimer.current) clearTimeout(showTimer.current);
      scheduleHide();
    }
    function onClick(e: MouseEvent) {
      const a = link(e.target);
      if (!a || pointerType.current === "mouse") return;
      if (currentHref.current === a.getAttribute("href")) return; // zweites Antippen: Link folgen
      e.preventDefault();
      open(a);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);
    document.addEventListener("click", onClick);
    const onScroll = () => setPreview(null);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("click", onClick);
    };
  }, []);

  if (!preview) return null;
  return (
    <div
      data-wiki-preview
      onPointerEnter={() => hideTimer.current && clearTimeout(hideTimer.current)}
      onPointerLeave={() => {
        hideTimer.current = setTimeout(() => setPreview(null), 250);
      }}
      style={{
        position: "fixed",
        left: preview.x,
        top: preview.y,
        width: 288,
        transform: preview.below ? undefined : "translateY(-100%)",
      }}
      className="z-[60] rounded-xl border border-line bg-surface p-3 shadow-lg"
    >
      <p className="mb-1 flex items-center gap-2">
        <span className="font-serif text-lg text-fg">{preview.title}</span>
        <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[11px] text-fg-soft">{preview.category}</span>
      </p>
      {preview.excerpt && <p className="line-clamp-4 text-sm text-fg-soft">{preview.excerpt}</p>}
      <Link href={preview.href} className="mt-2 inline-block text-xs font-medium text-accent hover:underline">
        Wiki-Eintrag öffnen
      </Link>
    </div>
  );
}
