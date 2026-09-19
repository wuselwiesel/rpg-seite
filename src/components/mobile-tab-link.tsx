"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

// Zeigt den Tab sofort als aktiv, sobald getippt wurde – nicht erst, wenn die Seite geladen ist.
function TabInner({ icon, label, isActive }: { icon: React.ReactNode; label: string; isActive: boolean }) {
  const { pending } = useLinkStatus();
  return (
    <span
      className={`flex flex-col items-center gap-0.5 ${isActive || pending ? "text-accent" : "text-muted"} ${
        pending ? "scale-95" : ""
      } transition`}
    >
      {icon}
      {label}
    </span>
  );
}

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
    <Link href={href} className="flex flex-1 items-center justify-center py-3 text-[11px] font-medium">
      <TabInner icon={icon} label={label} isActive={!!isActive} />
    </Link>
  );
}
