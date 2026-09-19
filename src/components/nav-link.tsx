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
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <Link href={href} className="group block">
      <NavInner icon={icon} isActive={!!isActive}>
        {children}
      </NavInner>
    </Link>
  );
}
