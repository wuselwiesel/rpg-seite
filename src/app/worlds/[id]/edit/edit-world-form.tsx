"use client";

import { useActionState } from "react";
import { updateWorld } from "../../actions";
import { AvatarUpload } from "@/components/avatar-upload";
import type { World } from "@/lib/types";

export function EditWorldForm({ world }: { world: World }) {
  const action = updateWorld.bind(null, world.id);
  const [error, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 text-sm text-fg-soft">
        Titelbild
        <AvatarUpload
          name="cover_image_url"
          initialUrl={world.cover_image_url}
          displayName={world.name}
          bucket="world-covers"
          variant="cover"
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
