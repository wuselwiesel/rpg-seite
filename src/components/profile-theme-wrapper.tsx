"use client";

import { useSyncExternalStore } from "react";
import { profileThemeStyle, type ProfileTheme } from "@/lib/profile-theme";

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

export function ProfileThemeWrapper({ theme, children }: { theme: ProfileTheme; children: React.ReactNode }) {
  const dark = useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );

  return (
    <div style={profileThemeStyle(theme, dark)} className="min-h-full bg-app text-fg">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-app" />
      {children}
    </div>
  );
}
