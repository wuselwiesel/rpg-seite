"use client";

export function PrintButton() {
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
