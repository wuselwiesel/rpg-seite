"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  icon,
  children,
  exact,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition ${
        isActive ? "bg-accent-strong text-on-accent-strong" : "text-fg-soft hover:bg-surface-2 hover:text-fg"
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}
