"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { createHighlight } from "@/app/stories/actions";
import { storyBackground } from "@/lib/stories";
import type { Story } from "@/lib/types";

export function NewHighlightForm({ characterId, stories }: { characterId: string; stories: Story[] }) {
  const [error, formAction, pending] = useActionState(createHighlight.bind(null, characterId), null);
  const [selected, setSelected] = useState<string[]>([]);

  if (stories.length === 0) {
    return (
      <p className="text-fg-soft">
        Du hast noch keine Storys. Teile zuerst eine{" "}
        <Link href="/stories/new" className="text-accent underline">
          Story
        </Link>
        , um sie in einem Highlight zu behalten.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Name
        <input
          name="title"
          required
          maxLength={30}
          placeholder="z. B. Reisen"
          className="rounded-md border border-line bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent"
        />
      </label>

      <div>
        <p className="mb-2 text-sm text-fg-soft">Storys auswählen (auch abgelaufene)</p>
        <div className="grid grid-cols-3 gap-1.5">
          {stories.map((s) => {
            const on = selected.includes(s.id);
            return (
              <label key={s.id} className="relative block aspect-[9/16] cursor-pointer overflow-hidden rounded-lg bg-surface-2">
                <input
                  type="checkbox"
                  name="story_ids"
                  value={s.id}
                  checked={on}
                  onChange={() => setSelected((prev) => (on ? prev.filter((x) => x !== s.id) : [...prev, s.id]))}
                  className="sr-only"
                />
                {s.video_url ? (
                  <video src={`${s.video_url}#t=0.1`} preload="metadata" muted playsInline className="h-full w-full object-cover" />
                ) : s.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center p-2"
                    style={{ background: storyBackground(s.bg) }}
                  >
                    <p className="line-clamp-5 text-center font-serif text-xs text-neutral-900">{s.text_content}</p>
                  </div>
                )}
                {new Date(s.expires_at) < new Date() && (
                  <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">Abgelaufen</span>
                )}
                <span
                  className={`absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                    on ? "border-accent-strong bg-accent-strong text-on-accent-strong" : "border-white bg-black/30"
                  }`}
                >
                  {on && <Check className="h-4 w-4" strokeWidth={3} />}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={pending || selected.length === 0}
        className="rounded-md bg-accent-strong px-5 py-2.5 font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Speichere..." : "Highlight erstellen"}
      </button>
    </form>
  );
}
