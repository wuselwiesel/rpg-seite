"use client";

import { Printer } from "lucide-react";

// Öffnet den Druckdialog des Browsers; dort „Als PDF speichern“ wählen (die Seite hat dafür eine eigene Druckansicht).
export function PdfButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`flex w-fit items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-fg-soft transition hover:border-accent hover:text-accent print:hidden ${className}`}
    >
      <Printer className="h-4 w-4" strokeWidth={2} />
      Als PDF speichern
    </button>
  );
}
