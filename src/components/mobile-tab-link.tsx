"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { isNavActive } from "@/lib/nav-model";

// Zeigt den Tab sofort als aktiv, sobald getippt wurde – nicht erst, wenn die Seite geladen ist.
function TabInner({
  icon,
  label,
  isActive,
  showLabel,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  showLabel: boolean;
  badge: number;
}) {
  const { pending } = useLinkStatus();
  const on = isActive || pending;
  return (
    <span
      className={`relative flex flex-col items-center gap-0.5 transition ${on ? "text-fg [&_svg]:[stroke-width:2.6]" : "text-muted"} ${
        pending ? "scale-90" : ""
      }`}
    >
      {icon}
      <span className={showLabel ? "" : "sr-only"}>{label}</span>
      {badge > 0 && (
        <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-on-accent-strong" aria-label={`${badge} ungelesen`}>
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </span>
  );
}

export function MobileTabLink({
  href,
  icon,
  label,
  exact,
  also,
  exclude,
  badge = 0,
  showLabel = true,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  exact?: boolean;
  // Weitere Pfade, bei denen der Tab aktiv ist (Seiten hinter der Welt-Seite)
  also?: string[];
  // Unterseiten, die nicht mitzählen
  exclude?: string[];
  // Zahl am Symbol (z. B. ungelesenes Feedback)
  badge?: number;
  // Instagram-Stil (Ingame): nur Icons, der Name bleibt für Screenreader.
  showLabel?: boolean;
}) {
  const pathname = usePathname();
  const isActive = isNavActive({ id: href, label, href, icon: "feed", exact, also, exclude }, pathname);

  return (
    <Link
      href={href}
      aria-label={label}
      // Wer den Tab der Seite antippt, auf der er schon ist (z. B. Feed), landet wieder ganz oben
      onClick={(e) => {
        if (pathname === href) {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }}
      className={`flex flex-1 items-center justify-center text-[11px] font-medium ${showLabel ? "py-3" : "py-3.5"}`}
    >
      <TabInner icon={icon} label={label} isActive={isActive} showLabel={showLabel} badge={badge} />
    </Link>
  );
}
