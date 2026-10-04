"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

function NavInner({ icon, children, isActive }: { icon: React.ReactNode; children: React.ReactNode; isActive: boolean }) {
  const { pending } = useLinkStatus();
  return (
    <span
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition ${
        isActive || pending ? "bg-accent-strong text-on-accent-strong" : "text-fg-soft group-hover:bg-surface-2 group-hover:text-fg"
      }`}
    >
      {icon}
      {children}
    </span>
  );
}

export function NavLink({
  href,
  icon,
  children,
  exact,
  exclude,
  also,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  exact?: boolean;
  // Unterseite, die nicht mitzählt (z. B. hat „Würfelverlauf“ unter /story seinen eigenen Eintrag)
  exclude?: string;
  // Weitere Pfade, bei denen der Eintrag ebenfalls aktiv ist (z. B. liegen die Beziehungen im Wiki)
  also?: string[];
}) {
  const pathname = usePathname();
  const isActive =
    (also?.some((a) => pathname === a || pathname?.startsWith(`${a}/`)) ?? false) ||
    (exact ? pathname === href : pathname === href || pathname?.startsWith(`${href}/`)) && !(exclude && (pathname === exclude || pathname?.startsWith(`${exclude}/`)));

  return (
    <Link href={href} className="group block">
      <NavInner icon={icon} isActive={!!isActive}>
        {children}
      </NavInner>
    </Link>
  );
}
