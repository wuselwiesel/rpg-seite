"use client";

import { usePathname } from "next/navigation";

// Zwei Spalten wie in Bear: links die Liste, rechts die Notiz. Am Handy nur eins von beiden (Liste auf /notizen, sonst die Notiz).
export function NotesShell({ list, children }: { list: React.ReactNode; children: React.ReactNode }) {
  const onIndex = usePathname().replace(/\/$/, "") === "/notizen";
  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      <aside className={`${onIndex ? "block" : "hidden"} min-w-0 border-line lg:sticky lg:top-0 lg:block lg:h-dvh lg:w-[22rem] lg:shrink-0 lg:overflow-y-auto lg:border-r xl:w-96`}>{list}</aside>
      <section className={`${onIndex ? "hidden" : "block"} min-w-0 flex-1 lg:block`}>{children}</section>
    </div>
  );
}
