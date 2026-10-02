import Link from "next/link";
import { EmojiText } from "./custom-emoji-provider";

// Ein Badge als Chip (Symbol + Name). `locked` = noch nicht erreicht (grau), `progress` z. B. "3/10".
export function BadgeChip({
  icon,
  name,
  description,
  color,
  locked = false,
  progress,
  href,
}: {
  icon: string;
  name: string;
  description?: string;
  color: string;
  locked?: boolean;
  progress?: string;
  // Klick führt z. B. in die Sammlung.
  href?: string;
}) {
  const props = {
    title: description ? `${name} – ${description}` : name,
    className: `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
      locked ? "border-line bg-surface-2 text-muted opacity-70" : "text-fg"
    } ${href ? "transition hover:opacity-80" : ""}`,
    style: locked ? undefined : { borderColor: color, backgroundColor: `${color}1f` },
  };
  const content = (
    <>
      <span className={locked ? "grayscale" : ""} aria-hidden>
        <EmojiText text={icon} />
      </span>
      {name}
      {progress && <span className="text-[10px] text-muted">{progress}</span>}
    </>
  );
  return href ? (
    <Link href={href} {...props}>
      {content}
    </Link>
  ) : (
    <span {...props}>{content}</span>
  );
}
