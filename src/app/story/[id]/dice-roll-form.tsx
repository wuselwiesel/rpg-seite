"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Dices } from "lucide-react";
import { createDiceRoll } from "../actions";
import { parseSheetUrl, fetchPublicSheet } from "@/lib/charakterbogen";
import { getStatOptions, type StatOption } from "@/lib/charakterbogen-stats";
import type { Character } from "@/lib/types";

const DICE_SIZES = [4, 6, 8, 10, 12, 20, 100];

export function DiceRollForm({
  storyPostId,
  worldId,
  sheetUrl,
  targets,
}: {
  storyPostId: string;
  worldId: string;
  sheetUrl?: string | null;
  targets: Character[];
}) {
  const action = createDiceRoll.bind(null, storyPostId, worldId);
  const [error, formAction, pending] = useActionState(action, null);
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [target, setTarget] = useState("");
  const [statOptions, setStatOptions] = useState<StatOption[]>([]);
  const wasPending = useRef(false);

  useEffect(() => {
    if (!sheetUrl) return;
    const ref = parseSheetUrl(sheetUrl);
    if (!ref) return;

    let cancelled = false;
    fetchPublicSheet(ref)
      .then((sheet) => {
        if (cancelled || !sheet) return;
        setStatOptions(getStatOptions(sheet.data));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [sheetUrl]);

  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      setLabel("");
      setValue("");
      setTarget("");
    }
    wasPending.current = pending;
  }, [pending, error]);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl bg-surface-2 p-4">
      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Worauf würfelst du?
        <input
          type="text"
          name="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
          placeholder="z. B. Überzeugen, Klettern, Sinnesschärfe..."
          className="rounded-md border border-line bg-app px-3 py-2 text-fg outline-none focus:border-accent"
        />
      </label>

      {statOptions.length > 0 && (
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Wert übernehmen (optional)
          <select
            defaultValue=""
            onChange={(e) => {
              const opt = statOptions.find((o) => o.name === e.target.value);
              if (!opt) return;
              setValue(String(opt.value));
              setLabel((current) => current || opt.name);
            }}
            className="rounded-md border border-line bg-app px-3 py-2 text-fg outline-none focus:border-accent"
          >
            <option value="" disabled>
              Aus Charakterbogen wählen...
            </option>
            {statOptions.map((o) => (
              <option key={o.name} value={o.name}>
                {o.name} ({o.value})
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm text-fg-soft">
          Wert
          <input
            type="number"
            name="value"
            min={1}
            max={999}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
            className="rounded-md border border-line bg-app px-3 py-2 text-fg outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm text-fg-soft">
          Würfel
          <select
            name="die"
            defaultValue={20}
            className="rounded-md border border-line bg-app px-3 py-2 text-fg outline-none focus:border-accent"
          >
            {DICE_SIZES.map((d) => (
              <option key={d} value={d}>
                W{d}
              </option>
            ))}
          </select>
        </label>
      </div>

      {targets.length > 0 && (
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Gegen wen? (optional)
          <select
            name="target_character_id"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="rounded-md border border-line bg-app px-3 py-2 text-fg outline-none focus:border-accent"
          >
            <option value="">Niemanden – nur für dich</option>
            {targets.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-2 self-start rounded-md bg-accent-strong px-4 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
      >
        <Dices className="h-4 w-4" strokeWidth={2} />
        {pending ? "Würfle..." : "Würfeln"}
      </button>
    </form>
  );
}
