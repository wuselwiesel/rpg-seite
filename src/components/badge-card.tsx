import { TIER_LABEL, type BadgeTier } from "@/lib/badges";
import { EmojiText } from "./custom-emoji-provider";

// Große Badge-Karte für Katalog und Sammlung: Symbol, Name, so erreichst du es, was es bedeutet.
export function BadgeCard({
  icon,
  name,
  description,
  meaning,
  color,
  tier,
  locked = false,
  progress,
  footnote,
  hideStatus = false,
  children,
}: {
  icon: string;
  name: string;
  description: string;
  meaning?: string;
  color: string;
  tier?: BadgeTier;
  locked?: boolean;
  // Fortschritt zu einem noch nicht erreichten Badge.
  progress?: { value: number; max: number };
  // z. B. "Erhalten am 3. Mai" oder "Verliehen von Mira".
  footnote?: string;
  // Katalog der Welt-Badges: weder „erreicht“ noch „noch offen“ anzeigen.
  hideStatus?: boolean;
  children?: React.ReactNode;
}) {
  const pct = progress ? Math.min(100, Math.round((progress.value / progress.max) * 100)) : 0;
  return (
    <li
      className={`flex gap-3 rounded-2xl border p-3.5 ${locked ? "border-line bg-surface" : ""}`}
      style={locked ? undefined : { borderColor: color, backgroundColor: `${color}14` }}
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl ${locked ? "bg-surface-2 grayscale" : ""}`}
        style={locked ? undefined : { backgroundColor: `${color}2e` }}
        aria-hidden
      >
        <EmojiText text={icon} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h3 className={`font-semibold ${locked ? "text-fg-soft" : "text-fg"}`}>{name}</h3>
          {tier && (
            <span className="text-[11px] text-muted">{TIER_LABEL[tier]}</span>
          )}
          {hideStatus ? null : locked ? (
            <span className="text-[11px] text-muted">noch offen</span>
          ) : (
            <span className="text-[11px] font-medium" style={{ color }}>
              erreicht
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-fg-soft">{description}</p>
        {meaning && <p className="mt-0.5 text-xs italic text-muted">{meaning}</p>}
        {locked && progress && (
          <div className="mt-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-0.5 text-[11px] text-muted">
              {progress.value} von {progress.max}
            </p>
          </div>
        )}
        {footnote && <p className="mt-1 text-[11px] text-muted">{footnote}</p>}
        {children}
      </div>
    </li>
  );
}
