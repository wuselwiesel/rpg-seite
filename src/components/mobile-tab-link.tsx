"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobileTabLink({
  href,
  icon,
  label,
  exact,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`flex flex-1 flex-col items-center gap-0.5 py-3 text-[11px] font-medium transition ${
        isActive ? "text-accent" : "text-muted"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
