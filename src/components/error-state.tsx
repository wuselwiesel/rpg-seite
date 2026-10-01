import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

// Gemeinsames Fallback-UI für error.tsx-Boundaries: zeigt eine freundliche
// Meldung statt der generischen Next.js-Fehlerseite, mit "Erneut versuchen"
// (re-rendert den betroffenen Segment-Teilbaum) und einem Weg zurück.
export function ErrorState({
  title = "Etwas ist schiefgelaufen",
  message = "Diese Seite konnte nicht geladen werden. Du kannst es erneut versuchen oder zur Startseite zurückkehren.",
  onRetry,
  digest,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  digest?: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <AlertTriangle className="h-10 w-10 text-accent" strokeWidth={1.5} />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-fg">{title}</h2>
        <p className="max-w-sm text-sm text-muted">{message}</p>
      </div>
      <div className="flex items-center gap-3 pt-1">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 rounded-full bg-accent-strong px-4 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
            Erneut versuchen
          </button>
        )}
        <Link
          href="/"
          className="rounded-full border border-line px-4 py-1.5 text-sm font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg"
        >
          Zur Startseite
        </Link>
      </div>
      {digest && <p className="pt-2 text-xs text-muted/70">Fehlercode: {digest}</p>}
    </div>
  );
}
