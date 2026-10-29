"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Award,
  Bell,
  ChevronRight,
  Compass,
  Dices,
  KeyRound,
  LifeBuoy,
  Newspaper,
  Palette,
  SlidersHorizontal,
  SmilePlus,
  Trash2,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { LogoutForm } from "@/components/logout-form";
import { startTour } from "@/lib/tour";

type Item = { href: string; label: string; hint: string; Icon: LucideIcon };

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Konto",
    items: [
      { href: "/profile/konto", label: "Konto", hint: "Profilbild, Benutzername, Spitzname", Icon: UserRound },
      { href: "/redaktion/profil/bearbeiten", label: "Redaktions-Profil", hint: "Banner, Bio, eigene Felder", Icon: Newspaper },
      { href: "/badges", label: "Badges", hint: "Erfolge, Titel und eigene Badges", Icon: Award },
    ],
  },
  {
    title: "App und Meldungen",
    items: [
      { href: "/profile/aussehen", label: "Aussehen", hint: "Farbpalette und App-Logo", Icon: Palette },
      { href: "/profile/personalisieren", label: "Personalisieren", hint: "Chat-Blase, Senden mit Enter, Badges", Icon: SlidersHorizontal },
      { href: "/profile/benachrichtigungen", label: "Benachrichtigungen", hint: "Push, Ruhezeiten, Stummschalten", Icon: Bell },
    ],
  },
  {
    title: "Schreiben",
    items: [
      { href: "/profile/emojis", label: "Eigene Emojis", hint: "Bilder als :name: in Texten nutzen", Icon: SmilePlus },
      { href: "/profile/zufallslisten", label: "Zufallslisten", hint: "Eigene Namen, Hobbys und mehr für den Würfel", Icon: Dices },
      { href: "/profile/papierkorb", label: "Papierkorb", hint: "Gelöschtes der letzten 30 Tage zurückholen", Icon: Trash2 },
    ],
  },
];

const INVITE_ITEM: Item = { href: "/profile/einladungscodes", label: "Einladungscodes", hint: "Wer sich registrieren darf", Icon: KeyRound };

const OFFICIAL_ITEM: Item = { href: "/profile/wortwinkel", label: "Konto wechseln", hint: "Zwischen Streuselschnecke und Wortwinkel", Icon: ArrowLeftRight };

const row =
  "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-surface-2";

// Instagram-artige Einstellungen: Auf dem Handy erst die Liste, dann die Unterseite; am Desktop Liste links, Inhalt rechts.
export function SettingsShell({ children, showOfficialAccount = false, showInviteCodes = false }: { children: React.ReactNode; showOfficialAccount?: boolean; showInviteCodes?: boolean }) {
  const pathname = usePathname();
  const isHub = pathname === "/profile";

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10 lg:flex lg:gap-10">
      <nav className={`${isHub ? "" : "hidden lg:block"} lg:w-72 lg:shrink-0`} aria-label="Einstellungen">
        <h1 className="mb-4 font-serif text-3xl text-fg">Einstellungen</h1>
        <div className="flex flex-col gap-5">
          {[...GROUPS, ...(showOfficialAccount || showInviteCodes ? [{ title: "Betreiberin", items: [...(showOfficialAccount ? [OFFICIAL_ITEM] : []), ...(showInviteCodes ? [INVITE_ITEM] : [])] }] : [])].map((group) => (
            <div key={group.title}>
              <p className="mb-1 px-3 text-xs font-medium text-muted">{group.title}</p>
              {group.items.map(({ href, label, hint, Icon }) => {
                const active = pathname === href || pathname?.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`${row} ${active ? "bg-surface-2" : ""}`}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="h-5 w-5 shrink-0 text-fg-soft" strokeWidth={2} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-medium text-fg">{label}</span>
                      <span className="block truncate text-xs text-muted">{hint}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
                  </Link>
                );
              })}
            </div>
          ))}
          <div>
            <p className="mb-1 px-3 text-xs font-medium text-muted">Hilfe</p>
            <Link href="/hilfe" className={row}>
              <LifeBuoy className="h-5 w-5 shrink-0 text-fg-soft" strokeWidth={2} />
              <span className="flex-1 text-[15px] font-medium text-fg">Hilfe</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
            </Link>
            <button type="button" onClick={() => startTour()} className={row}>
              <Compass className="h-5 w-5 shrink-0 text-fg-soft" strokeWidth={2} />
              <span className="flex-1 text-[15px] font-medium text-fg">Rundgänge</span>
            </button>
          </div>
          <div className="border-t border-line pt-4">
            <LogoutForm />
          </div>
        </div>
      </nav>
      <div className={`${isHub ? "hidden lg:block" : ""} min-w-0 flex-1 lg:max-w-md`}>{children}</div>
    </div>
  );
}
