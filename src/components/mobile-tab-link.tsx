"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

// Zeigt den Tab sofort als aktiv, sobald getippt wurde – nicht erst, wenn die Seite geladen ist.
function TabInner({
  icon,
  label,
  isActive,
  showLabel,
}: {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  showLabel: boolean;
}) {
  const { pending } = useLinkStatus();
  const on = isActive || pending;
  return (
    <span
      className={`flex flex-col items-center gap-0.5 transition ${on ? "text-fg [&_svg]:[stroke-width:2.6]" : "text-muted"} ${
        pending ? "scale-90" : ""
      }`}
    >
      {icon}
      <span className={showLabel ? "" : "sr-only"}>{label}</span>
    </span>
  );
}

export function MobileTabLink({
  href,
  icon,
  label,
  exact,
  showLabel = true,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  exact?: boolean;
  // Instagram-Stil (Ingame): nur Icons, der Name bleibt für Screenreader.
  showLabel?: boolean;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname === href || pathname?.startsWith(`${href}/`);

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
      <TabInner icon={icon} label={label} isActive={!!isActive} showLabel={showLabel} />
    </Link>
  );
}
