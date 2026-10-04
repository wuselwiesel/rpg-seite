"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Dices } from "lucide-react";
import { createCharacter } from "../actions";
import { AvatarUpload } from "@/components/avatar-upload";
import { genderOfSheet } from "@/lib/random-pools";
import { npcBio, npcName, rollNpcSheet, speciesOfSheet } from "@/lib/npc-random";
import type { CustomPools } from "@/lib/random-pools";

export function NewCharacterForm({ takenNames, randomLists, startAsNpc = false }: { takenNames: string[]; randomLists?: Partial<CustomPools>; startAsNpc?: boolean }) {
  const [error, formAction, pending] = useActionState(createCharacter, null);
  const searchParams = useSearchParams();
  const isWelcome = searchParams.get("welcome") === "1";
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("mensch");
  const [gender, setGender] = useState("");
  const [bio, setBio] = useState("");
  const [isNpc, setIsNpc] = useState(startAsNpc && !isWelcome);
  // Gewürfelter Bogen: wird mit dem Formular abgeschickt und zusammen mit dem Charakter angelegt
  const [sheetJson, setSheetJson] = useState("");

  function rollEverything() {
    const sheet = rollNpcSheet({ rng: Math.random, custom: randomLists, avoid: new Set(takenNames) });
    setName(npcName(sheet));
    setSpecies(speciesOfSheet(sheet));
    const g = genderOfSheet(sheet);
    setGender(g === "männlich" ? "maennlich" : (g ?? ""));
    setBio(npcBio(sheet));
    setSheetJson(JSON.stringify(sheet));
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-10">
      <h1 className="mb-1 font-serif text-3xl text-fg">
        {isWelcome ? "Willkommen! Erschaffe deinen ersten Charakter" : "Neuer Charakter"}
      </h1>
      <p className="mb-6 text-sm text-muted">
        Du kannst später jederzeit weitere Charaktere anlegen und zwischen ihnen wechseln.
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="sheet_json" value={sheetJson} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          {!isWelcome && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-fg-soft">
              <input type="checkbox" name="is_npc" checked={isNpc} onChange={(e) => setIsNpc(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
              NPC
            </label>
          )}
          <button
            type="button"
            onClick={rollEverything}
            aria-label="Komplett würfeln"
            className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5 text-sm font-medium text-fg transition hover:bg-surface-3"
          >
            <Dices className="h-4 w-4" strokeWidth={2} />
            Komplett würfeln
          </button>
        </div>
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Name
          <input
            type="text"
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Nutzername (optional)
          <div className="flex items-center rounded-md border border-line bg-surface focus-within:border-accent">
            <span className="pl-3 text-muted">@</span>
            <input
              type="text"
              name="username"
              
              placeholder="mira.test"
              pattern="[A-Za-z0-9._]{3,30}"
              title="3-30 Zeichen: Buchstaben, Zahlen, Punkt, Unterstrich"
              autoCapitalize="none"
              className="min-w-0 flex-1 bg-transparent px-1 py-2 text-fg outline-none"
            />
          </div>
        </label>
        <div className="flex flex-col gap-1 text-sm text-fg-soft">
          Avatar (optional)
          <AvatarUpload name="avatar_url" displayName={name || "?"} />
        </div>
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Kurzbeschreibung (optional)
          <textarea
            name="bio"
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm text-fg-soft">
            Geschlecht (optional)
            <select
              name="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
            >
              <option value="">Unbekannt</option>
              <option value="weiblich">Weiblich</option>
              <option value="maennlich">Männlich</option>
              <option value="divers">Divers</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-fg-soft">
            Wesen
            <select
              name="species"
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
            >
              <option value="mensch">Mensch</option>
              <option value="vampir">Vampir</option>
              <option value="werwolf">Werwolf</option>
            </select>
          </label>
        </div>
        <span className="-mt-3 text-xs text-muted">Wird u. a. für die Filter des Schicksalswürfels verwendet.</span>
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Haus / Familie (optional)
        <input
          type="text"
          name="house"
          maxLength={60}
          placeholder="z. B. Haus Blackwood"
          className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
        />
        <span className="text-xs text-muted">Für den Stammbaum: Charaktere mit demselben Namen werden gruppiert.</span>
        </label>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-md bg-accent-strong px-4 py-2 font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Erschaffe..." : isNpc ? "NPC erschaffen" : "Charakter erschaffen"}
        </button>
      </form>
    </div>
  );
}
