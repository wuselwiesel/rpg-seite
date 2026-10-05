"use client";

import { useRouter } from "next/navigation";

// Ein Tag im Monatsblatt: Klick oder Rechtsklick auf die freie Fläche (nicht auf einen Eintrag) trägt dort ein Ereignis ein (öffnet das Formular mit diesem Tag).
export function CalendarDay({ day, addHref, className, children }: { day: number; addHref: string | null; className: string; children: React.ReactNode }) {
  const router = useRouter();
  if (!addHref) {
    return (
      <li data-day={day} className={className}>
        {children}
      </li>
    );
  }
  const add = (e: React.SyntheticEvent) => {
    if ((e.target as HTMLElement).closest("a")) return;
    e.preventDefault();
    router.push(addHref);
  };
  return (
    <li
      data-day={day}
      tabIndex={0}
      aria-label={`${day}. – Ereignis eintragen`}
      onClick={add}
      onContextMenu={add}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) add(e);
      }}
      className={`${className} cursor-pointer transition hover:border-accent/60 hover:bg-surface-2 focus-visible:border-accent focus-visible:outline-none`}
    >
      {children}
    </li>
  );
}
