"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Clover, Dices } from "lucide-react";
import { createDiceRoll, getLuckPointsRemaining, rerollWithLuck, type DiceRollState } from "../actions";
import { parseSheetUrl, fetchPublicSheet } from "@/lib/charakterbogen";
import { getStatOptions, luckPointsFromGl, type StatOption } from "@/lib/charakterbogen-stats";
import { normalizeSheet } from "@/lib/sheet-rules";
import { DICE_CONDITIONS, resolveCondition } from "@/lib/dice-conditions";
import { createClient } from "@/lib/supabase/client";
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
  condition: string | null;
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
  // Zustand wie „Betrunken“: Auswahl (Zustand) und Stufe, z. B. „betrunken“ und „stark“
  const [conditionId, setConditionId] = useState("");
  const [conditionLevel, setConditionLevel] = useState("");
  const condition = resolveCondition(conditionId && conditionLevel ? `${conditionId}:${conditionLevel}` : "");
  const [die, setDie] = useState(20);
  const [target, setTarget] = useState("");
  const [statOptions, setStatOptions] = useState<StatOption[]>([]);
  const wasPending = useRef(false);

  const [luckRemaining, setLuckRemaining] = useState<number | null>(null);
  const [lastRoll, setLastRoll] = useState<LastRoll | null>(null);
  const [rerolling, startReroll] = useTransition();
  const [rerollError, setRerollError] = useState<string | null>(null);
  // Ergebnis des letzten Wurfs (null = freier Wurf) und ob die Frage „Glückspunkt nutzen?“ weggeklickt wurde
  const [lastSuccess, setLastSuccess] = useState<boolean | null>(null);
  const [luckDismissed, setLuckDismissed] = useState(false);

  const glueckOption = statOptions.find((o) => o.category === "Attribut" && o.name === "Glück");
  // Anzahl der Glückspunkte pro Szene (nicht der Glück-Wert selbst).
  const luckMax = glueckOption ? luckPointsFromGl(glueckOption.base ?? glueckOption.value) : 0;

  // Werte aus dem ChaBo des Charakters; gibt es keinen, aus dem alten Charakterbogen (öffentlicher Link).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await createClient().from("character_sheets").select("data").eq("character_id", writerId).maybeSingle<{ data: unknown }>();
        if (cancelled) return;
        if (data) {
          setStatOptions(getStatOptions(normalizeSheet(data.data)));
          return;
        }
        const ref = sheetUrl ? parseSheetUrl(sheetUrl) : null;
        if (!ref) {
          setStatOptions([]);
          return;
        }
        const sheet = await fetchPublicSheet(ref);
        if (!cancelled) setStatOptions(sheet ? getStatOptions(sheet.data) : []);
      } catch {
        // Ohne Bogen kann man trotzdem frei würfeln.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sheetUrl, writerId]);

  // Vor dem ersten Wurf schon anzeigen, wie viele Glückspunkte in dieser Szene noch übrig sind.
  useEffect(() => {
    if (!glueckOption || luckMax <= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Rücksetzen, wenn die Glücks-Option entfällt; die Abfrage darunter ist asynchron
      setLuckRemaining(null);
      return;
    }
    let cancelled = false;
    getLuckPointsRemaining(storyPostId, writerId, luckMax).then((remaining) => {
      if (!cancelled) setLuckRemaining(remaining);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyPostId, writerId, luckMax]);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      setLastRoll({
        label,
        statName: statName || null,
        value: value === "" ? null : Number(value),
        // Bonus samt Malus des Zustands (so rechnet auch der Server)
        bonus: (bonus === "" ? 0 : Number(bonus)) + (value === "" ? 0 : (condition?.malus ?? 0)),
        condition: value === "" ? null : (condition?.text ?? null),
        die,
        targetCharacterId: target || null,
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect -- gehört zum Abschluss der Server-Action (siehe oben)
      if (state.luckRemaining !== null) setLuckRemaining(state.luckRemaining);
      setLastSuccess(state.success ?? null);
      setLuckDismissed(false);
      setLabel("");
      setStatName("");
      setValue("");
      setBonus("");
      setConditionId("");
      setConditionLevel("");
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
        luckMax,
      });
      if (result.error) setRerollError(result.error);
      if (result.luckRemaining !== null) setLuckRemaining(result.luckRemaining);
      if (!result.error) setLastSuccess(result.success ?? null);
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl bg-surface-2 p-4">
      <input type="hidden" name="character_id" value={writerId} />
      {glueckOption && luckMax > 0 && <input type="hidden" name="luck_max" value={luckMax} />}

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
      {value !== "" && (
        <div className="flex flex-col gap-2">
          <label className="flex w-48 max-w-full flex-col gap-1 text-sm text-fg-soft">
            Zustand (optional)
            <select
              value={conditionId}
              onChange={(e) => {
                setConditionId(e.target.value);
                setConditionLevel(DICE_CONDITIONS.find((c) => c.id === e.target.value)?.levels[0]?.id ?? "");
              }}
              className="rounded-md border border-line bg-app px-3 py-2 text-fg outline-none focus:border-accent"
            >
              <option value="">Keiner</option>
              {DICE_CONDITIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          {conditionId && (
            <div role="radiogroup" aria-label="Stärke" className="flex flex-wrap gap-1.5">
              {DICE_CONDITIONS.find((c) => c.id === conditionId)?.levels.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  role="radio"
                  aria-checked={conditionLevel === l.id}
                  onClick={() => setConditionLevel(l.id)}
                  className={`flex flex-col items-center rounded-lg border px-3 py-1.5 text-sm transition ${conditionLevel === l.id ? "border-accent bg-surface text-fg" : "border-line text-fg-soft hover:border-accent/50"}`}
                >
                  <span className="font-medium">{l.label}</span>
                  <span className="text-xs text-muted">{l.malus}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {value !== "" && condition && <input type="hidden" name="condition" value={`${conditionId}:${conditionLevel}`} />}


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

      {lastRoll && lastRoll.value !== null && lastSuccess === false && glueckOption && luckRemaining !== null && luckRemaining > 0 && !luckDismissed && (
        <div role="group" aria-label="Glückspunkt nutzen" className="flex flex-col gap-2.5 rounded-xl border border-emerald-600/30 bg-emerald-500/10 p-3.5">
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-fg">
            <Clover className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
            Glückspunkt nutzen?
            <CloverRow remaining={luckRemaining} />
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={reroll}
              disabled={rerolling}
              className="rounded-md bg-accent-strong px-3.5 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
            >
              {rerolling ? "Würfle nochmal..." : "Ja, nochmal würfeln"}
            </button>
            <button type="button" onClick={() => setLuckDismissed(true)} disabled={rerolling} className="rounded-md px-3 py-1.5 text-sm text-muted transition hover:bg-surface hover:text-fg disabled:opacity-50">
              Nein
            </button>
          </div>
          {rerollError && <p className="text-xs text-red-600 dark:text-red-400">{rerollError}</p>}
        </div>
      )}
    </form>
  );
}
