"use client";

import { WikiTemplateEditor } from "./wiki-template-editor";
import { parseTemplate } from "@/lib/wiki-template";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { saveWorldSettings } from "../../actions";
import { AvatarUpload } from "@/components/avatar-upload";
import { RichTextEditor } from "@/components/rich-text-editor";
import { useConfirm } from "@/components/confirm-dialog";
import type { World } from "@/lib/types";
import { PermissionFields } from "@/components/permission-fields";
import { parsePermissions } from "@/lib/world-permissions";
import type { TalentDef } from "@/lib/talents";
import type { NatureDef } from "@/lib/natures";
import { TalentEditor } from "./talent-editor";
import { NatureEditor } from "./nature-editor";

// Alle Einstellungen einer Welt in einem Formular mit einem Speichern-Knopf, der am unteren Rand mitläuft.
// listsSlot: der (serverseitig gerenderte) Abschnitt „Auswahllisten“, der zwischen Willkommen und Talenten steht.
export function EditWorldForm({
  world,
  welcomeInitial,
  talentsInitial,
  naturesInitial,
  listsSlot,
  notifySlot,
}: {
  world: World;
  welcomeInitial: string;
  talentsInitial: TalentDef[];
  naturesInitial: NatureDef[];
  listsSlot: ReactNode;
  // Schalter für die eigenen Admin-Meldungen (wirken sofort, ohne Speichern)
  notifySlot: ReactNode;
}) {
  const [dirty, setDirty] = useState(false);
  const [dice, setDice] = useState(world.dice_enabled !== false);
  const [review, setReview] = useState(world.review_characters === true);
  const [talents, setTalents] = useState<TalentDef[]>(talentsInitial);
  const [natures, setNatures] = useState<NatureDef[]>(naturesInitial);
  const formRef = useRef<HTMLFormElement>(null);
  // Nach bestätigtem Entfernen von Talenten das Formular noch einmal ohne Rückfrage abschicken
  const confirmed = useRef(false);
  const { confirm, dialog } = useConfirm();

  const [state, formAction, pending] = useActionState(async (prev: string | null, formData: FormData) => {
    const result = await saveWorldSettings(world.id, prev, formData);
    if (result === "ok") setDirty(false);
    return result;
  }, null);

  // Wer mit ungespeicherten Änderungen die Seite verlässt, wird gefragt
  useEffect(() => {
    if (!dirty) return;
    function warn(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (confirmed.current) {
      confirmed.current = false;
      return;
    }
    if (!dice) return;
    const removed = talentsInitial.filter((t) => !talents.some((r) => r.name.trim().toLowerCase() === t.name.toLowerCase()));
    const removedNatures = naturesInitial.filter((n) => !natures.some((r) => r.id === n.id));
    if (removed.length === 0 && removedNatures.length === 0) return;
    e.preventDefault();
    const parts: string[] = [];
    if (removed.length > 0) parts.push(`${removed.length} Talent(e) entfallen und verlieren ihre Punkte in den Bögen.`);
    if (removedNatures.length > 0) parts.push(`${removedNatures.map((n) => n.name || "Eine Natur").join(", ")} entfällt: Bei Charakteren mit dieser Natur bleiben die Werte stehen, die Natur wird aber nicht mehr angezeigt.`);
    void confirm({
      message: `${parts.join(" ")} Speichern?`,
      confirmLabel: "Speichern",
      danger: true,
    }).then((ok) => {
      if (!ok) return;
      confirmed.current = true;
      formRef.current?.requestSubmit();
    });
  }

  const sections = [
    { id: "allgemein", label: "Allgemein" },
    { id: "zugang", label: "Zugang" },
    { id: "regeln", label: "Regeln" },
    { id: "willkommen", label: "Willkommen" },
    { id: "listen", label: "Auswahllisten" },
    { id: "meldungen", label: "Meldungen" },
    ...(dice ? [{ id: "talente", label: "Talente" }, { id: "naturen", label: "Naturen" }] : []),
  ];

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} onInput={() => setDirty(true)} className="flex flex-col gap-4">
      <nav aria-label="Abschnitte" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {sections.map((x) => (
          <a
            key={x.id}
            href={`#${x.id}`}
            className="shrink-0 rounded-full border border-line px-3 py-1 text-sm text-fg-soft transition hover:border-accent hover:text-accent"
          >
            {x.label}
          </a>
        ))}
      </nav>

      <section id="allgemein" aria-label="Allgemein" className="flex scroll-mt-20 flex-col gap-4">
      <div data-tour="welt-titel" className="flex flex-col gap-1 text-sm text-fg-soft">
        Titelbild
        <AvatarUpload
          name="cover_image_url"
          initialUrl={world.cover_image_url}
          displayName={world.name}
          bucket="world-covers"
          variant="world"
          onChange={() => setDirty(true)}
        />
      </div>
      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Name der Welt
        <input
          type="text"
          name="name"
          required
          defaultValue={world.name}
          className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Beschreibung (optional)
        <textarea
          name="description"
          rows={4}
          defaultValue={world.description ?? ""}
          placeholder="Worum geht es in dieser Welt?"
          className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
        />
      </label>

      </section>

      <section id="zugang" aria-label="Zugang" className="mt-4 flex scroll-mt-20 flex-col gap-4 border-t border-line pt-6">
      <h2 className="font-serif text-xl text-fg">Zugang</h2>
      <label data-tour="welt-erkunden" className="flex flex-col gap-1 text-sm text-fg-soft">
        Erkunden vor dem Beitritt
        <select
          name="preview"
          defaultValue={world.preview ?? "none"}
          className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
        >
          <option value="none">Aus</option>
          <option value="info">Willkommen, Wiki und Figuren</option>
          <option value="full">Alles, auch Szenen</option>
        </select>
      </label>
      <label data-tour="welt-beitritt" className="flex flex-col gap-1 text-sm text-fg-soft">
        Beitritt
        <select
          name="join_mode"
          defaultValue={world.join_mode ?? "open"}
          className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
        >
          <option value="open">Offen</option>
          <option value="request">Auf Anfrage</option>
          <option value="invite">Nur auf Einladung</option>
        </select>
      </label>
      <label className="flex items-center gap-3 text-sm text-fg">
        <input
          type="checkbox"
          name="is_public"
          defaultChecked={world.is_public === true}
          className="h-4 w-4 accent-[var(--accent-strong)]"
        />
        Öffentlich in „Welten entdecken“
      </label>
      </section>

      <section id="regeln" aria-label="Regeln" className="mt-4 flex scroll-mt-20 flex-col gap-4 border-t border-line pt-6">
      <h2 className="font-serif text-xl text-fg">Regeln</h2>
      <label data-tour="welt-wuerfeln" className="flex items-center gap-3 text-sm text-fg">
        <input
          type="checkbox"
          name="dice_enabled"
          checked={dice}
          onChange={(e) => setDice(e.target.checked)}
          className="h-4 w-4 accent-[var(--accent-strong)]"
        />
        Würfeln
      </label>
      <label className="flex items-center gap-3 text-sm text-fg">
        <input type="checkbox" name="fate_enabled" defaultChecked={world.fate_enabled !== false} className="h-4 w-4 accent-[var(--accent-strong)]" />
        Schicksalswürfel
      </label>
      <label className="flex items-center gap-3 text-sm text-fg">
        <input type="checkbox" name="house_enabled" defaultChecked={world.house_enabled !== false} className="h-4 w-4 accent-[var(--accent-strong)]" />
        Haus / Familie bei Charakteren
      </label>
      <label className="flex items-center gap-3 text-sm text-fg">
        <input type="checkbox" name="quote_enabled" defaultChecked={world.quote_enabled !== false} className="h-4 w-4 accent-[var(--accent-strong)]" />
        Zitat bei Charakteren
      </label>
      <label className="flex items-center gap-3 text-sm text-fg">
        <input type="checkbox" name="status_enabled" defaultChecked={world.status_enabled !== false} className="h-4 w-4 accent-[var(--accent-strong)]" />
        Status-Zeile bei Charakteren
      </label>
      <label className="flex items-center gap-3 text-sm text-fg">
        <input type="checkbox" name="cast_enabled" defaultChecked={world.cast_enabled === true} className="h-4 w-4 accent-[var(--accent-strong)]" />
        Besetzung (Rollenliste im Wiki)
      </label>
      <label className="flex items-center gap-3 text-sm text-fg">
        <input type="checkbox" name="character_wiki_enabled" defaultChecked={world.character_wiki_enabled === true} className="h-4 w-4 accent-[var(--accent-strong)]" />
        Wiki-Eintrag für jede Figur
      </label>
      <WikiTemplateEditor initial={parseTemplate(world.character_wiki_template)} />
      <label data-tour="welt-pruefen" className="flex items-center gap-3 text-sm text-fg">
        <input
          type="checkbox"
          name="review_characters"
          checked={review}
          onChange={(e) => setReview(e.target.checked)}
          className="h-4 w-4 accent-[var(--accent-strong)]"
        />
        Neue Charaktere prüfen
      </label>

      <PermissionFields value={parsePermissions(world.permissions)} allowSecrets={world.allow_secrets !== false} />
      </section>

      <section id="willkommen" aria-label="Willkommen" className="mt-4 scroll-mt-20 border-t border-line pt-6">
        <h2 data-tour="welt-willkommen" className="mb-3 font-serif text-xl text-fg">
          Willkommen
        </h2>
        <RichTextEditor
          name="welcome"
          initialContent={welcomeInitial}
          minHeight={160}
          showToolbar
          placeholder="Regeln, wichtige Orte, offene Rollen …"
          onChange={() => setDirty(true)}
        />
      </section>

      {listsSlot}

      <section id="meldungen" aria-label="Meine Admin-Meldungen" data-tour="welt-admin-meldungen" className="mt-4 flex scroll-mt-20 flex-col gap-3 border-t border-line pt-6">
        <h2 className="font-serif text-xl text-fg">Meine Admin-Meldungen</h2>
        {notifySlot}
      </section>

      {dice && (
        <section id="talente" aria-label="Talente" className="mt-4 scroll-mt-20 border-t border-line pt-6">
          <h2 data-tour="welt-talente" className="mb-3 font-serif text-xl text-fg">
            Talente
          </h2>
          <TalentEditor
            rows={talents}
            onChange={(next) => {
              setTalents(next);
              setDirty(true);
            }}
          />
          <input type="hidden" name="talents" value={JSON.stringify(talents)} />
        </section>
      )}

      {dice && (
        <section id="naturen" aria-label="Besondere Naturen" className="mt-4 scroll-mt-20 border-t border-line pt-6">
          <h2 data-tour="welt-naturen" className="mb-3 font-serif text-xl text-fg">
            Besondere Naturen
          </h2>
          <NatureEditor
            rows={natures}
            onChange={(next) => {
              setNatures(next);
              setDirty(true);
            }}
          />
          <input type="hidden" name="natures" value={JSON.stringify(natures)} />
        </section>
      )}

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 mt-2 flex items-center gap-3 border-t border-line bg-app/90 px-4 py-3 backdrop-blur lg:bottom-0 lg:mx-0 lg:rounded-xl lg:border lg:px-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent-strong px-5 py-2 font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Speichere..." : "Speichern"}
        </button>
        <span role="status" className="min-w-0 text-sm">
          {state && state !== "ok" ? (
            <span className="text-red-600 dark:text-red-400">{state}</span>
          ) : dirty ? (
            <span className="text-muted">Nicht gespeichert</span>
          ) : state === "ok" ? (
            <span className="text-accent">Gespeichert.</span>
          ) : null}
        </span>
      </div>
      {dialog}
    </form>
  );
}
