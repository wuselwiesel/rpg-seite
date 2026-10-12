"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink } from "lucide-react";
import type { PDFDocumentProxy, PDFDocumentLoadingTask } from "pdfjs-dist";

type Target = { el: HTMLElement; url: string; name: string };

// Zeigt die PDF-Karten einer Wiki-Seite (div[data-pdf]) mit den Seiten direkt in der Seite an.
// Die Seiten werden erst gezeichnet, wenn sie ins Bild kommen; die Karte mit dem Link bleibt als Fallback bestehen.
export function PdfEmbeds() {
  const [targets, setTargets] = useState<Target[]>([]);

  useEffect(() => {
    const found: Target[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("[data-pdf]")) {
      if (el.closest(".ProseMirror")) continue; // im Editor bleibt die Karte
      const a = el.querySelector("a");
      const url = a?.getAttribute("href") ?? "";
      if (!/^https?:\/\//i.test(url)) continue;
      found.push({ el, url, name: (a?.textContent ?? "").trim() || "PDF" });
    }
    Promise.resolve().then(() => setTargets(found));
  }, []);

  return <>{targets.map((t) => createPortal(<PdfView url={t.url} name={t.name} host={t.el} />, t.el, t.url))}</>;
}

function PdfView({ url, name, host }: { url: string; name: string; host: HTMLElement }) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [failed, setFailed] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let task: PDFDocumentLoadingTask | null = null;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        task = pdfjs.getDocument({ url });
        const pdf = await task.promise;
        if (cancelled) return;
        host.setAttribute("data-embedded", "");
        setDoc(pdf);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [url, host]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(0, Math.floor(el.clientWidth - 16)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [doc]);

  if (failed || !doc) return null;
  return (
    <div className="pdf-embed">
      <div className="pdf-embed-head">
        <span className="min-w-0 truncate">{name}</span>
        <a href={url} target="_blank" rel="noopener noreferrer" aria-label="PDF in neuem Tab öffnen" title="In neuem Tab öffnen">
          <ExternalLink className="h-4 w-4" strokeWidth={2} />
        </a>
      </div>
      <div ref={boxRef} className="pdf-embed-pages">
        {width > 0 && Array.from({ length: doc.numPages }, (_, i) => <PdfPage key={i} doc={doc} pageNumber={i + 1} width={width} />)}
      </div>
    </div>
  );
}

function PdfPage({ doc, pageNumber, width }: { doc: PDFDocumentProxy; pageNumber: number; width: number }) {
  const holderRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [height, setHeight] = useState(Math.round(width * 1.414));
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = holderRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    let task: { cancel: () => void; promise: Promise<unknown> } | null = null;
    (async () => {
      const page = await doc.getPage(pageNumber);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      const scale = width / base.width;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: scale * dpr });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      setHeight(Math.round(base.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      task = page.render({ canvasContext: ctx, canvas, viewport });
      try {
        await task.promise;
      } catch {
        /* abgebrochen */
      }
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [visible, doc, pageNumber, width]);

  return (
    <div ref={holderRef} className="pdf-embed-page" style={{ height }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} aria-label={`Seite ${pageNumber} von ${doc.numPages}`} />
    </div>
  );
}
