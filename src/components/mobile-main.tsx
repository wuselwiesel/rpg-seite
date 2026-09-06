"use client";

import { usePathname } from "next/navigation";
import { isImmersiveChatPath } from "@/lib/immersive-routes";

export function MobileMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const immersive = isImmersiveChatPath(pathname);

  return (
    <main
      className={`min-w-0 flex-1 ${immersive ? "" : "pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0"}`}
    >
      {children}
    </main>
  );
}
