"use client";

import { useEffect } from "react";
import "./globals.css";
import { ErrorState } from "@/components/error-state";

// Greift nur, wenn das Root-Layout selbst abstürzt (sehr selten). Braucht eigene
// html/body-Tags, da es das Root-Layout komplett ersetzt - siehe AGENTS.md-Hinweis
// zu error.js-Konventionen in dieser Next.js-Version.
const themeInitScript = `
try {
  var stored = localStorage.getItem('theme');
  var dark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', dark);
  var palette = localStorage.getItem('palette');
  if (palette) document.documentElement.setAttribute('data-palette', palette);
} catch (e) {}
`;

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full bg-app text-fg antialiased" suppressHydrationWarning>
        <ErrorState
          title="Wortwinkel konnte nicht geladen werden"
          message="Da ist etwas Grundlegendes schiefgelaufen. Ein Neuladen hilft meistens."
          onRetry={retry}
          digest={error.digest}
        />
      </body>
    </html>
  );
}
