"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { NotesProvider } from "./notes-store";
import { NotesList } from "./notes-list";
import { NotesSidebar } from "./notes-sidebar";
import { NotesShortcuts, FOCUS_EVENT } from "./notes-shortcuts";
import type { NoteFolder, NoteView } from "@/lib/notes";

// Zwei Spalten wie in Bear: links die Liste, rechts die Notiz. Am Handy nur eins von beiden (Liste auf /notizen, sonst die Notiz).
export function NotesShell({
  notes,
  folders,
  worlds,
  activeWorldId,
  openCount,
  children,
}: {
  notes: NoteView[];
  folders: NoteFolder[];
  worlds: { id: string; name: string }[];
  activeWorldId: string | null;
  openCount: number;
  children: React.ReactNode;
}) {
  const onIndex = usePathname().replace(/\/$/, "") === "/notizen";
  // Fokus-Modus: die Notiz füllt den ganzen Bildschirm (Alt+F oder Knopf, Esc beendet)
  const [focus, setFocus] = useState(false);
  useEffect(() => {
    const toggle = () => setFocus((v) => !v);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFocus(false);
    window.addEventListener(FOCUS_EVENT, toggle);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(FOCUS_EVENT, toggle);
      window.removeEventListener("keydown", onKey);
    };
  }, []);
  return (
    <NotesProvider notes={notes} folders={folders} worlds={worlds} activeWorldId={activeWorldId} openCount={openCount}>
      <NotesShortcuts />
      <div className="flex min-h-full flex-col lg:flex-row">
        <aside aria-label="Ordner und Tags" className="hidden min-w-0 border-line xl:sticky xl:top-0 xl:block xl:h-dvh xl:w-56 xl:shrink-0 xl:overflow-y-auto xl:border-r">
          <NotesSidebar />
        </aside>
        <aside className={`${onIndex ? "block" : "hidden"} min-w-0 border-line lg:sticky lg:top-0 lg:block lg:h-dvh lg:w-[22rem] lg:shrink-0 lg:overflow-y-auto lg:border-r`}>
          <NotesList />
        </aside>
        <section className={focus ? "fixed inset-0 z-[80] block overflow-y-auto bg-app" : `${onIndex ? "hidden" : "block"} min-w-0 flex-1 lg:block`}>{children}</section>
      </div>
    </NotesProvider>
  );
}
