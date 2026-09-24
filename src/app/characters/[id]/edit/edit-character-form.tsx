"use client";

import { useActionState, useState } from "react";
import { updateCharacter } from "../../actions";
import { AvatarUpload } from "@/components/avatar-upload";
import { ProfileThemeFields } from "@/components/profile-theme-fields";
import type { Character } from "@/lib/types";

export function EditCharacterForm({
  character,
  mentionableCharacters,
}: {
  character: Character;
  mentionableCharacters: Character[];
}) {
  const action = updateCharacter.bind(null, character.id);
  const [error, formAction, pending] = useActionState(action, null);
  const [name, setName] = useState(character.name);
  const [relationshipStatus, setRelationshipStatus] = useState(character.relationship_status ?? "");

  return (
    <form action={formAction} className="flex flex-col gap-4">
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
            defaultValue={character.username ?? ""}
            placeholder="mira.test"
            pattern="[A-Za-z0-9._]{3,30}"
            title="3-30 Zeichen: Buchstaben, Zahlen, Punkt, Unterstrich"
            autoCapitalize="none"
            className="min-w-0 flex-1 bg-transparent px-1 py-2 text-fg outline-none"
          />
        </div>
      </label>
      <div className="flex flex-col gap-1 text-sm text-fg-soft">
        Avatar
        <AvatarUpload
          name="avatar_url"
          displayName={name || "?"}
          initialUrl={character.avatar_url}
        />
      </div>
      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Kurzbeschreibung (optional)
        <textarea
          name="bio"
          rows={4}
          defaultValue={character.bio ?? ""}
          className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
        />
      </label>
      <ProfileThemeFields
        name={name}
        avatarUrl={character.avatar_url}
        initialFont={character.theme_font}
        initialAccent={character.theme_accent}
        initialBg={character.theme_bg}
      />
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Geschlecht (optional)
          <select
            name="gender"
            defaultValue={character.gender ?? ""}
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
            defaultValue={character.species ?? "mensch"}
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
        Beziehungsstatus (optional)
        <select
          name="relationship_status"
          value={relationshipStatus}
          onChange={(e) => setRelationshipStatus(e.target.value)}
          className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
        >
          <option value="">Keine Angabe</option>
          <option value="single">Single</option>
          <option value="beziehung">In einer Beziehung</option>
          <option value="kompliziert">Es ist kompliziert</option>
          <option value="verheiratet">Verheiratet</option>
        </select>
      </label>
      {relationshipStatus && relationshipStatus !== "single" && (
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Partner:in
          <select
            name="partner_character_id"
            defaultValue={character.partner_character_id ?? ""}
            className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
          >
            <option value="">Keine Angabe</option>
            {mentionableCharacters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Beste:r Freund:in (optional)
        <select
          name="best_friend_character_id"
          defaultValue={character.best_friend_character_id ?? ""}
          className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
        >
          <option value="">Keine Angabe</option>
          {mentionableCharacters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted">
          Wird für logisch stimmige Schicksale genutzt (z. B. "wird von der Partnerin betrogen" zieht die echte Partnerin).
        </span>
      </label>

      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Haus / Familie (optional)
        <input
          type="text"
          name="house"
          defaultValue={character.house ?? ""}
          maxLength={60}
          placeholder="z. B. Haus Blackwood"
          className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
        />
        <span className="text-xs text-muted">Für den Stammbaum: Charaktere mit demselben Namen werden gruppiert.</span>
      </label>
      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Charakterbogen-Link (optional)
        <input
          type="url"
          name="sheet_url"
          defaultValue={character.sheet_url ?? ""}
          placeholder="Freigabelink aus Charakterbogen"
          className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
        />
      </label>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 self-start rounded-md bg-accent-strong px-5 py-2 font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Speichere..." : "Speichern"}
      </button>
    </form>
  );
}
