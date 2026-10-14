"use client";

import { useEffect, useState } from "react";
import { AtSign, BarChart2, CircleHelp, Timer, X } from "lucide-react";
import { MAX_STORY_MENTIONS, type StorySticker } from "@/lib/story-stickers";
import { searchCharactersToTag } from "@/app/stories/actions";
import { CharacterAvatar } from "@/components/character-avatar";

const input = "w-full rounded-md border border-line bg-app px-3 py-1.5 text-base text-fg outline-none focus:border-accent";

function tomorrowIso() {
  return new Date(Date.now() + 24 * 3600_000).toISOString();
}

// Charaktere der Welt zum Markieren suchen; wer markiert ist, bekommt eine Benachrichtigung.
function MentionPicker({
  sticker,
  onChange,
}: {
  sticker: Extract<StorySticker, { type: "mention" }>;
  onChange: (next: Extract<StorySticker, { type: "mention" }>) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; name: string; avatar_url: string | null }[]>([]);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      searchCharactersToTag(query).then((rows) => {
        if (!cancelled) setResults(rows);
      });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const chosen = new Set(sticker.people.map((p) => p.id));
  const full = sticker.people.length >= MAX_STORY_MENTIONS;

  return (
    <div className="flex flex-col gap-2">
      {sticker.people.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {sticker.people.map((p) => (
            <li key={p.id} className="flex items-center gap-1 rounded-full bg-surface-2 py-1 pl-3 pr-1.5 text-sm text-fg">
              @{p.name}
              <button
                type="button"
                aria-label={`${p.name} nicht mehr markieren`}
                onClick={() => onChange({ ...sticker, people: sticker.people.filter((x) => x.id !== p.id) })}
                className="flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-surface-3 hover:text-fg"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.25} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {!full && (
        <>
          <input className={input} maxLength={40} placeholder="Charakter suchen" aria-label="Charakter zum Markieren suchen" value={query} onChange={(e) => setQuery(e.target.value)} />
          <ul className="flex flex-col">
            {results
              .filter((r) => !chosen.has(r.id))
              .map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ ...sticker, people: [...sticker.people, { id: r.id, name: r.name }] });
                      setQuery("");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left text-sm text-fg transition hover:bg-surface-2"
                  >
                    <CharacterAvatar name={r.name} avatarUrl={r.avatar_url} size={28} />
                    <span className="min-w-0 flex-1 truncate">{r.name}</span>
                  </button>
                </li>
              ))}
          </ul>
        </>
      )}
    </div>
  );
}

// Editor für Story-Sticker (Markieren, Umfrage, Fragen-Box, Countdown): je Art höchstens einer.
export function StoryStickerEditor({
  stickers,
  onChange,
}: {
  stickers: StorySticker[];
  onChange: (next: StorySticker[]) => void;
}) {
  const has = (type: StorySticker["type"]) => stickers.find((s) => s.type === type);
  const upsert = (sticker: StorySticker) => onChange([...stickers.filter((s) => s.type !== sticker.type), sticker]);
  const remove = (type: StorySticker["type"]) => onChange(stickers.filter((s) => s.type !== type));

  function toggle(type: StorySticker["type"]) {
    if (has(type)) return remove(type);
    const id = crypto.randomUUID().slice(0, 12);
    if (type === "mention") upsert({ id, type, people: [] });
    if (type === "poll") upsert({ id, type, q: "", options: ["Ja", "Nein"] });
    if (type === "question") upsert({ id, type, prompt: "" });
    if (type === "countdown") {
      upsert({ id, type, title: "", endsAt: tomorrowIso() });
    }
  }

  const mention = has("mention") as Extract<StorySticker, { type: "mention" }> | undefined;
  const poll = has("poll") as Extract<StorySticker, { type: "poll" }> | undefined;
  const question = has("question") as Extract<StorySticker, { type: "question" }> | undefined;
  const countdown = has("countdown") as Extract<StorySticker, { type: "countdown" }> | undefined;
  const toLocal = (iso: string) => {
    const d = new Date(iso);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const buttons = [
    { type: "mention" as const, label: "Markieren", icon: AtSign },
    { type: "poll" as const, label: "Umfrage", icon: BarChart2 },
    { type: "question" as const, label: "Fragen-Box", icon: CircleHelp },
    { type: "countdown" as const, label: "Countdown", icon: Timer },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3">
      <p className="text-sm font-medium text-fg-soft">Sticker</p>
      <div className="flex flex-wrap gap-2">
        {buttons.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            type="button"
            aria-pressed={!!has(type)}
            onClick={() => toggle(type)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              has(type) ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:text-fg"
            }`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
            {label}
          </button>
        ))}
      </div>

      {mention && <MentionPicker sticker={mention} onChange={upsert} />}

      {poll && (
        <div className="flex flex-col gap-2">
          <input className={input} maxLength={120} placeholder="Frage der Umfrage" value={poll.q} onChange={(e) => upsert({ ...poll, q: e.target.value })} />
          {poll.options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                className={input}
                maxLength={40}
                placeholder={`Antwort ${i + 1}`}
                value={o}
                onChange={(e) => upsert({ ...poll, options: poll.options.map((x, j) => (j === i ? e.target.value : x)) })}
              />
              {poll.options.length > 2 && (
                <button type="button" aria-label="Antwort entfernen" onClick={() => upsert({ ...poll, options: poll.options.filter((_, j) => j !== i) })} className="text-muted hover:text-fg">
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              )}
            </div>
          ))}
          {poll.options.length < 4 && (
            <button type="button" onClick={() => upsert({ ...poll, options: [...poll.options, ""] })} className="w-fit text-xs text-accent hover:underline">
              + Antwort hinzufügen
            </button>
          )}
        </div>
      )}

      {question && (
        <input className={input} maxLength={120} placeholder="Deine Frage, z. B. Was verbirgt das Moor?" value={question.prompt} onChange={(e) => upsert({ ...question, prompt: e.target.value })} />
      )}

      {countdown && (
        <div className="flex flex-col gap-2">
          <input className={input} maxLength={80} placeholder="Wofür läuft der Countdown?" value={countdown.title} onChange={(e) => upsert({ ...countdown, title: e.target.value })} />
          <input
            type="datetime-local"
            className={input}
            value={toLocal(countdown.endsAt)}
            onChange={(e) => e.target.value && upsert({ ...countdown, endsAt: new Date(e.target.value).toISOString() })}
            aria-label="Ende des Countdowns"
          />
        </div>
      )}
    </div>
  );
}
