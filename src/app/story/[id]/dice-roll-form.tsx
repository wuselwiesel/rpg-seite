"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Clover, Dices } from "lucide-react";
import { createDiceRoll, getLuckPointsRemaining, rerollWithLuck, type DiceRollState } from "../actions";
import { parseSheetUrl, fetchPublicSheet } from "@/lib/charakterbogen";
import { getStatOptions, type StatOption } from "@/lib/charakterbogen-stats";
import type { Character } from "@/lib/types";

const DICE_SIZES = [4, 6, 8, 10, 12, 20, 100];
const INITIAL_STATE: DiceRollState = { error: null, luckRemaining: null };

type LastRoll = {
  label: string;
  statName: string | null;
  value: number | null;
  bonus: number;
  die: number;
  targetCharacterId: string | null;
};

function CloverRow({ remaining }: { remaining: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`${remaining} Glückspunkt${remaining === 1 ? "" : "e"} übrig`}>
      {Array.from({ length: remaining }, (_, i) => (
        <Clover key={i} className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
      ))}
      {remaining === 0 && <span className="text-xs text-muted">0</span>}
    </span>
  );
}

export function DiceRollForm({
  storyPostId,
  worldId,
  sheetUrl,
  targets,
  writerId,
  onTyping,
}: {
  storyPostId: string;
  worldId: string;
  sheetUrl?: string | null;
  targets: Character[];
  writerId: string;
  onTyping?: () => void;
}) {
  const action = createDiceRoll.bind(null, storyPostId, worldId);
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  const [label, setLabel] = useState("");
  const [statName, setStatName] = useState("");
  const [value, setValue] = useState("");
  const [bonus, setBonus] = useState("");
  const [die, setDie] = useState(20);
  const [target, setTarget] = useState("");
  const [statOptions, setStatOptions] = useState<StatOption[]>([]);
  const wasPending = useRef(false);

  const [luckRemaining, setLuckRemaining] = useState<number | null>(null);
  const [lastRoll, setLastRoll] = useState<LastRoll | null>(null);
  const [rerolling, startReroll] = useTransition();
  const [rerollError, setRerollError] = useState<string | null>(null);

  const glueckOption = statOptions.find((o) => o.category === "Attribut" && o.name === "Glück");

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

  // Vor dem ersten Wurf schon anzeigen, wie viele Glückspunkte in dieser Szene noch übrig sind.
  useEffect(() => {
    if (!glueckOption || glueckOption.value <= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Rücksetzen, wenn die Glücks-Option entfällt; die Abfrage darunter ist asynchron
      setLuckRemaining(null);
      return;
    }
    let cancelled = false;
    getLuckPointsRemaining(storyPostId, writerId, glueckOption.value).then((remaining) => {
      if (!cancelled) setLuckRemaining(remaining);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyPostId, writerId, glueckOption?.value]);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      setLastRoll({
        label,
        statName: statName || null,
        value: value === "" ? null : Number(value),
        bonus: bonus === "" ? 0 : Number(bonus),
        die,
        targetCharacterId: target || null,
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect -- gehört zum Abschluss der Server-Action (siehe oben)
      if (state.luckRemaining !== null) setLuckRemaining(state.luckRemaining);
      setLabel("");
      setStatName("");
      setValue("");
      setBonus("");
      setTarget("");
      setRerollError(null);
    }
    wasPending.current = pending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, state]);

  function reroll() {
    if (!lastRoll || !glueckOption) return;
    setRerollError(null);
    startReroll(async () => {
      const result = await rerollWithLuck(storyPostId, worldId, {
        ...lastRoll,
        characterId: writerId,
        luckMax: glueckOption.value,
      });
      if (result.error) setRerollError(result.error);
      if (result.luckRemaining !== null) setLuckRemaining(result.luckRemaining);
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl bg-surface-2 p-4">
      <input type="hidden" name="character_id" value={writerId} />
      {glueckOption && glueckOption.value > 0 && <input type="hidden" name="luck_max" value={glueckOption.value} />}

      {luckRemaining !== null && (
        <p className="flex items-center gap-2 text-xs text-muted">
          Glückspunkte in dieser Szene: <CloverRow remaining={luckRemaining} />
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Worauf würfelst du?
        <input
          type="text"
          name="label"
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            onTyping?.();
          }}
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
              setStatName(opt.name);
              setLabel((current) => current || opt.name);
            }}
            className="rounded-md border border-line bg-app px-3 py-2 text-fg outline-none focus:border-accent"
          >
            <option value="" disabled>
              Aus Charakterbogen wählen...
            </option>
            <optgroup label="Attribute">
              {statOptions
                .filter((o) => o.category === "Attribut")
                .map((o) => (
                  <option key={o.name} value={o.name}>
                    {o.name} ({o.value})
                  </option>
                ))}
            </optgroup>
            <optgroup label="Talente">
              {statOptions
                .filter((o) => o.category === "Talent")
                .map((o) => (
                  <option key={o.name} value={o.name}>
                    {o.name} ({o.value})
                  </option>
                ))}
            </optgroup>
          </select>
        </label>
      )}

      {statName && (
        <input type="hidden" name="stat_name" value={statName} />
      )}
      {statName && (
        <p className="-mt-1 flex items-center gap-1.5 text-xs text-muted">
          Wert: <span className="font-medium text-fg-soft">{statName}</span>
          <button
            type="button"
            onClick={() => setStatName("")}
            className="text-muted underline decoration-dotted hover:text-fg"
          >
            entfernen
          </button>
        </p>
      )}

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm text-fg-soft">
          Wert (optional)
          <input
            type="number"
            name="value"
            min={1}
            max={999}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="frei würfeln"
            className="rounded-md border border-line bg-app px-3 py-2 text-fg outline-none focus:border-accent"
          />
        </label>
        <label className="flex w-24 flex-col gap-1 text-sm text-fg-soft">
          Bonus
          <input
            type="number"
            name="bonus"
            min={-99}
            max={99}
            value={bonus}
            onChange={(e) => setBonus(e.target.value)}
            placeholder="±0"
            className="rounded-md border border-line bg-app px-3 py-2 text-fg outline-none focus:border-accent"
          />
        </label>
        <label className="flex w-24 flex-col gap-1 text-sm text-fg-soft">
          Würfel
          <select
            name="die"
            value={die}
            onChange={(e) => setDie(Number(e.target.value))}
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
      <p className="-mt-1 text-xs text-muted">
        Ohne Wert wird nur der Wurf angezeigt, ohne Erfolg/Misserfolg. Bonus erschwert (negativ) oder
        erleichtert (positiv) die Probe, indem er auf den Wert angerechnet wird.
      </p>

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

      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-2 self-start rounded-md bg-accent-strong px-4 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
      >
        <Dices className="h-4 w-4" strokeWidth={2} />
        {pending ? "Würfle..." : "Würfeln"}
      </button>

      {lastRoll && glueckOption && luckRemaining !== null && luckRemaining > 0 && (
        <div className="flex flex-col items-start gap-1 border-t border-line pt-3">
          <button
            type="button"
            onClick={reroll}
            disabled={rerolling}
            className="flex items-center gap-2 rounded-md border border-line px-3 py-1.5 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-fg disabled:opacity-50"
          >
            <Clover className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
            {rerolling ? "Würfle nochmal..." : "Glückspunkt einsetzen: nochmal würfeln"}
          </button>
          {rerollError && <p className="text-xs text-red-600 dark:text-red-400">{rerollError}</p>}
        </div>
      )}
    </form>
  );
}
