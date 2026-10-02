"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { applyAppLogo, getStoredLogoId } from "@/lib/app-logos";

// Hält das gewählte Tab-Icon aktuell: Next setzt beim Seitenwechsel eigene Icon-Links neu.
export function AppLogoSync() {
  const pathname = usePathname();

  useEffect(() => {
    const apply = () => applyAppLogo(getStoredLogoId(), document.documentElement.classList.contains("dark"));
    apply();
    // apply() ändert nur, was abweicht - dadurch endet die Schleife von selbst.
    const observer = new MutationObserver(() => apply());
    observer.observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ["href"] });
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
