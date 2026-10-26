"use client";

import { Download } from "lucide-react";

// Desktop: Druckdialog → „Als PDF speichern".
// Mobil (pdfHref gesetzt): direkter Download-Link auf die PDF-Route.
export function PrintButton({ pdfHref }: { pdfHref?: string }) {
  if (pdfHref) {
    return (
      <a
        href={pdfHref}
        download
        className="flex items-center gap-1.5 rounded-md bg-accent-strong px-3 py-1.5 font-medium text-on-accent-strong transition hover:opacity-90"
      >
        <Download className="h-4 w-4" strokeWidth={2} />
        Als PDF laden
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-accent-strong px-3 py-1.5 font-medium text-on-accent-strong transition hover:opacity-90"
    >
      Als PDF speichern
    </button>
  );
}
