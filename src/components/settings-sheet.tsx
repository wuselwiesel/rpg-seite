"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CircleHelp, Compass, Search, Settings, UserPlus, Users, X, type LucideIcon } from "lucide-react";
import { SwitchAccountButton } from "./switch-account-button";
import { InstallAppButton } from "./install-app-button";
import { ThemeToggle } from "./theme-toggle";
import { BUBBLE_CHANGE_EVENT, BUBBLE_ENABLED_KEY, isBubbleEnabled } from "./chat-bubble";
import { startTour } from "@/lib/tour";

// Event, mit dem das ≡ im eigenen Profil (Handy) den Einstellungen-Bogen öffnet
export const SETTINGS_OPEN_EVENT = "ww:settings-open";
export const openSettingsSheet = () => window.dispatchEvent(new Event(SETTINGS_OPEN_EVENT));

const ROW = "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-1 px-3 text-xs font-medium text-muted">{title}</p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </section>
  );
}

function Row({ href, icon: Icon, onNavigate, children }: { href: string; icon: LucideIcon; onNavigate: () => void; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={onNavigate} className={ROW}>
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
      {children}
    </Link>
  );
}

function subscribeBubble(callback: () => void) {
  window.addEventListener(BUBBLE_CHANGE_EVENT, callback);
  return () => window.removeEventListener(BUBBLE_CHANGE_EVENT, callback);
}

// Schalter „Chat-Blase“ (gilt für dieses Gerät), schlanke Fassung ohne Erklärzeile
export function BubbleSwitch({ className = "" }: { className?: string }) {
  const enabled = useSyncExternalStore(subscribeBubble, isBubbleEnabled, () => true);
  function toggle() {
    try {
      localStorage.setItem(BUBBLE_ENABLED_KEY, enabled ? "off" : "on");
    } catch {
      /* egal */
    }
    window.dispatchEvent(new Event(BUBBLE_CHANGE_EVENT));
  }
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      Chat-Blase
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Chat-Blase anzeigen"
        onClick={toggle}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${enabled ? "bg-accent-strong" : "bg-surface-3"}`}
      >
        <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

// Inhalt des Einstellungen-Bogens; dieselbe Liste steht in der Redaktion unter „Du“
export function SettingsList({
  appAdmin = false,
  altAccount = null,
  onNavigate = () => {},
  search = true,
  you = true,
}: {
  appAdmin?: boolean;
  altAccount?: string | null;
  onNavigate?: () => void;
  // Suchfeld oben
  search?: boolean;
  // Abschnitt „Du“ (in der Redaktion steht er schon auf der Seite)
  you?: boolean;
}) {
  return (
    <>
      {search && (
        <Link href="/search" onClick={onNavigate} className="mb-4 flex items-center gap-3 rounded-xl bg-surface-2 px-4 py-3 text-[15px] text-muted transition hover:text-fg">
          <Search className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
          Suchen
        </Link>
      )}
      <div className="flex flex-col gap-4">
        {you && (
          <Section title="Du">
            <Row href="/characters" icon={Users} onNavigate={onNavigate}>
              Meine Charaktere
            </Row>
            <Row href="/friends" icon={UserPlus} onNavigate={onNavigate}>
              Freund:innen
            </Row>
            {appAdmin && (
              <Row href="/redaktion/ueberblick" icon={BarChart3} onNavigate={onNavigate}>
                Überblick
              </Row>
            )}
          </Section>
        )}
        <Section title="App">
          <Row href="/profile" icon={Settings} onNavigate={onNavigate}>
            Konto &amp; Einstellungen
          </Row>
          <BubbleSwitch className="rounded-xl px-3 py-1.5 text-[15px] font-medium text-fg-soft" />
          <div className="flex items-center justify-between rounded-xl px-3 py-1.5 text-[15px] font-medium text-fg-soft">
            Hell / Dunkel
            <ThemeToggle />
          </div>
          {altAccount && <SwitchAccountButton label={altAccount} className={`${ROW} disabled:opacity-50`} />}
          <Row href="/hilfe" icon={CircleHelp} onNavigate={onNavigate}>
            Hilfe
          </Row>
          <button
            type="button"
            onClick={() => {
              onNavigate();
              startTour();
            }}
            className={ROW}
          >
            <Compass className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            Rundgänge
          </button>
          <InstallAppButton onDone={onNavigate} className={ROW} />
        </Section>
      </div>
    </>
  );
}

// Handy: Einstellungen und seltener Gebrauchtes (früher das ≡-Menü oben). Öffnet sich per Event.
export function SettingsSheet({ appAdmin = false, altAccount = null }: { appAdmin?: boolean; altAccount?: string | null }) {
  const pathname = usePathname();
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt !== null && openAt === pathname;
  const close = () => setOpenAt(null);

  useEffect(() => {
    const onOpen = () => setOpenAt(pathname);
    window.addEventListener(SETTINGS_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(SETTINGS_OPEN_EVENT, onOpen);
  }, [pathname]);

  // Solange der Bogen offen ist, bleibt die Chat-Blase verborgen (globals.css: html[data-menu-open])
  useEffect(() => {
    const root = document.documentElement;
    if (open) root.setAttribute("data-menu-open", "");
    else root.removeAttribute("data-menu-open");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenAt(null);
    if (open) document.addEventListener("keydown", onKey);
    return () => {
      root.removeAttribute("data-menu-open");
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <div
        role="presentation"
        onClick={close}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <div
        role="dialog"
        aria-label="Einstellungen"
        aria-hidden={!open}
        className={`fixed inset-x-0 bottom-0 z-40 max-h-[88dvh] overflow-y-auto rounded-t-3xl border-t border-line bg-surface p-5 shadow-lg transition-[transform,visibility] duration-200 lg:hidden ${
          open ? "translate-y-0" : "invisible translate-y-full"
        }`}
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="font-serif text-lg text-fg">Einstellungen</span>
          <button type="button" onClick={close} aria-label="Schließen" className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg">
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
        <SettingsList appAdmin={appAdmin} altAccount={altAccount} onNavigate={close} />
      </div>
    </>
  );
}
