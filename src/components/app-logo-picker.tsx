"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { APP_LOGOS, DEFAULT_LOGO_ID, getStoredLogoId, setStoredLogoId, type AppLogoId } from "@/lib/app-logos";

export function AppLogoPicker() {
  const [active, setActive] = useState<AppLogoId>(DEFAULT_LOGO_ID);

  useEffect(() => {
    // localStorage gibt es erst im Browser, deshalb nach dem ersten Rendern lesen.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(getStoredLogoId());
  }, []);

  function choose(id: AppLogoId) {
    setActive(id);
    setStoredLogoId(id);
  }

  return (
    <div>
      <div className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-6">
        {APP_LOGOS.map((logo) => (
          <button
            key={logo.id}
            type="button"
            onClick={() => choose(logo.id)}
            title={logo.name}
            aria-pressed={active === logo.id}
            className="flex min-w-0 flex-col items-center gap-1.5"
          >
            <span
              className={`relative flex h-12 w-12 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-app transition ${
                active === logo.id ? "ring-fg" : "ring-transparent"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/icons/logos/${logo.id}-256.png`} alt="" width={48} height={48} className="h-12 w-12 rounded-full" />
              {active === logo.id && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-fg text-app">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
            </span>
            <span className="max-w-full truncate text-xs text-fg-soft">{logo.name}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">
        Gilt für das Tab-Symbol und „Zum Home-Bildschirm“ auf diesem Gerät. Eine bereits installierte App behält ihr Symbol.
      </p>
    </div>
  );
}
