"use client";

import { useActionState } from "react";
import { updateProfile } from "./actions";
import { AvatarUpload } from "@/components/avatar-upload";
import type { Profile } from "@/lib/types";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [error, formAction, pending] = useActionState(updateProfile, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 text-sm text-fg-soft">
        Profilbild
        <AvatarUpload
          name="avatar_url"
          initialUrl={profile.avatar_url}
          displayName={profile.nickname || profile.username}
        />
      </div>
      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Benutzername
        <input
          type="text"
          name="username"
          required
          minLength={2}
          defaultValue={profile.username}
          className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Spitzname (optional)
        <input
          type="text"
          name="nickname"
          defaultValue={profile.nickname ?? ""}
          placeholder="Wird anstelle des Benutzernamens angezeigt"
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
