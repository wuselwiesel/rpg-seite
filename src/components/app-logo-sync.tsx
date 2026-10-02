"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { applyAppLogo, getStoredLogoId } from "@/lib/app-logos";

// Hält das gewählte Tab-Icon aktuell: Next setzt beim Seitenwechsel gern eigene Icon-Links neu.
export function AppLogoSync() {
  const pathname = usePathname();

  useEffect(() => {
    const apply = () => applyAppLogo(getStoredLogoId(), document.documentElement.classList.contains("dark"));
    apply();
    const observer = new MutationObserver((records) => {
      const touched = records.some((r) =>
        [...r.addedNodes].some((n) => n instanceof HTMLLinkElement && /icon/.test(n.rel) && n.id !== "favicon"),
      );
      if (touched) apply();
    });
    observer.observe(document.head, { childList: true });
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
