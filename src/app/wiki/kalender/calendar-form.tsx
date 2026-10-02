"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { DEFAULT_CALENDAR, type WikiCalendar } from "@/lib/wiki-calendar";
import { saveWikiCalendar } from "./actions";

const input = "rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-accent";

// Kalender der Welt einstellen: Monate (Name, Tage) und die Bezeichnung hinter der Jahreszahl.
export function CalendarForm({ calendar }: { calendar: WikiCalendar }) {
  const router = useRouter();
  const [months, setMonths] = useState(calendar.months.map((m) => ({ name: m.name, days: String(m.days) })));
  const [era, setEra] = useState(calendar.era);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const total = months.reduce((n, m) => n + (Number.parseInt(m.days, 10) || 0), 0);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await saveWikiCalendar({ months, era });
    setBusy(false);
    if (res.ok) {
      setMsg({ ok: true, text: "Kalender gespeichert." });
      router.refresh();
    } else setMsg({ ok: false, text: res.error });
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 @xl:p-6" aria-label="Kalender einstellen">
      <div>
        <h2 className="font-serif text-2xl text-fg">Kalender der Welt</h2>
        <p className="text-sm text-muted">
          Lege fest, wie eure Welt die Zeit zählt: Monate mit eigenem Namen und eigener Länge. Bereits eingetragene Zeitpunkte bleiben gespeichert; gibt es einen Monat nicht mehr, steht dort „Monat 3“.
        </p>
      </div>
      <ol className="flex flex-col gap-2">
        {months.map((m, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-6 text-right text-sm text-muted">{i + 1}.</span>
            <input aria-label={`Name von Monat ${i + 1}`} value={m.name} maxLength={30} onChange={(e) => setMonths((cur) => cur.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className={`${input} min-w-0 flex-1`} placeholder="Name" />
            <input aria-label={`Tage in Monat ${i + 1}`} type="number" min={1} max={100} value={m.days} onChange={(e) => setMonths((cur) => cur.map((x, j) => (j === i ? { ...x, days: e.target.value } : x)))} className={`${input} w-20`} />
            <span className="text-sm text-muted">Tage</span>
            <button type="button" aria-label={`Monat ${i + 1} entfernen`} disabled={months.length <= 1} onClick={() => setMonths((cur) => cur.filter((_, j) => j !== i))} className="rounded p-2 text-muted transition hover:text-red-600 disabled:opacity-30">
              <Trash2 className="h-4 w-4" strokeWidth={2} />
            </button>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setMonths((cur) => [...cur, { name: "", days: "30" }])} className="flex items-center gap-1.5 text-sm text-accent hover:underline">
          <Plus className="h-4 w-4" strokeWidth={2} />
          Monat hinzufügen
        </button>
        <span className="text-sm text-muted">
          {months.length} {months.length === 1 ? "Monat" : "Monate"}, {total} Tage im Jahr
        </span>
        <button type="button" onClick={() => { setMonths(DEFAULT_CALENDAR.months.map((m) => ({ name: m.name, days: String(m.days) }))); setEra(""); }} className="ml-auto text-sm text-muted hover:text-fg">
          Auf gewöhnlichen Kalender zurücksetzen
        </button>
      </div>
      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Bezeichnung hinter der Jahreszahl (optional)
        <input value={era} maxLength={40} onChange={(e) => setEra(e.target.value)} className={`${input} sm:max-w-xs`} placeholder="z. B. n. d. Zeitenwende" />
      </label>
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-fg-soft" : "text-red-600 dark:text-red-400"}`}>
          {msg.text}
        </p>
      )}
      <div>
        <button type="submit" disabled={busy} className="rounded-lg bg-accent-strong px-5 py-2 font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50">
          {busy ? "Speichere …" : "Kalender speichern"}
        </button>
      </div>
    </form>
  );
}
