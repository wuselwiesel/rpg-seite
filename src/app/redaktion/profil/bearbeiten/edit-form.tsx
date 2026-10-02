"use client";

import { useActionState, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { saveRedaktionProfile } from "../../actions";
import { AvatarUpload } from "@/components/avatar-upload";
import { ProfileThemeFields } from "@/components/profile-theme-fields";
import type { RedaktionProfile, RedaktionProfileField } from "@/lib/types";

const field = "rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent";
const MAX_FIELDS = 12;
const MAX_PINNED = 3;

type Row = RedaktionProfileField & { key: number };

export function EditRedaktionProfileForm({
  name,
  avatarUrl,
  initial,
  postChoices,
}: {
  name: string;
  avatarUrl: string | null;
  initial: RedaktionProfile | null;
  postChoices: { id: string; label: string }[];
}) {
  const [error, formAction, pending] = useActionState(saveRedaktionProfile, null);
  const [nextKey, setNextKey] = useState((initial?.custom_fields.length ?? 0) + 1);
  const [rows, setRows] = useState<Row[]>(() => (initial?.custom_fields ?? []).map((f, i) => ({ ...f, key: i })));
  const [pinned, setPinned] = useState<string[]>(initial?.pinned_post_ids ?? []);
  const [bio, setBio] = useState(initial?.bio ?? "");

  function update(key: number, patch: Partial<RedaktionProfileField>) {
    setRows((r) => r.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function move(index: number, dir: -1 | 1) {
    setRows((r) => {
      const target = index + dir;
      if (target < 0 || target >= r.length) return r;
      const copy = [...r];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }

  function togglePinned(id: string) {
    setPinned((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX_PINNED ? p : [...p, id]));
  }

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-lg text-fg">Banner</h2>
        <AvatarUpload name="banner_url" initialUrl={initial?.banner_url} displayName={name} variant="cover" />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-lg text-fg">Über dich</h2>
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Status-Zeile
          <input
            name="status_text"
            maxLength={80}
            defaultValue={initial?.status_text ?? ""}
            placeholder="z. B. 📖 schreibt gerade an Kapitel 3"
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Bio
          <textarea
            name="bio"
            rows={5}
            maxLength={600}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Erzähl etwas über dich – Emojis und Zeilenumbrüche sind erlaubt."
            className={field}
          />
          <span className="self-end text-xs text-muted">{bio.length}/600</span>
        </label>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-serif text-lg text-fg">Eigene Felder</h2>
          <p className="text-xs text-muted">
            Zum Beispiel „Lieblingsbuch“, „Pronomen“ oder „Spielzeiten“. Felder ohne Titel oder Inhalt werden nicht
            gespeichert.
          </p>
        </div>
        {rows.map((row, i) => (
          <div key={row.key} className="flex flex-col gap-2 rounded-xl border border-line p-3">
            <div className="flex gap-2">
              <input
                name="field_icon"
                value={row.icon}
                onChange={(e) => update(row.key, { icon: e.target.value })}
                placeholder="🙂"
                aria-label="Symbol"
                className={`w-14 text-center ${field}`}
              />
              <input
                name="field_title"
                value={row.title}
                maxLength={40}
                onChange={(e) => update(row.key, { title: e.target.value })}
                placeholder="Titel"
                aria-label="Titel"
                className={`min-w-0 flex-1 ${field}`}
              />
              <div className="flex shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Nach oben"
                  className="rounded p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === rows.length - 1}
                  aria-label="Nach unten"
                  className="rounded p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg disabled:opacity-30"
                >
                  <ArrowDown className="h-4 w-4" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))}
                  aria-label="Feld entfernen"
                  className="rounded p-1.5 text-muted transition hover:bg-surface-2 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
            </div>
            <textarea
              name="field_text"
              rows={2}
              maxLength={300}
              value={row.text}
              onChange={(e) => update(row.key, { text: e.target.value })}
              placeholder="Inhalt"
              aria-label="Inhalt"
              className={field}
            />
          </div>
        ))}
        {rows.length < MAX_FIELDS && (
          <button
            type="button"
            onClick={() => {
              setRows((r) => [...r, { icon: "", title: "", text: "", key: nextKey }]);
              setNextKey((k) => k + 1);
            }}
            className="flex w-fit items-center gap-1.5 rounded-md bg-surface-2 px-3 py-1.5 text-sm font-medium text-fg-soft transition hover:text-fg"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Feld hinzufügen
          </button>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-lg text-fg">Gestaltung</h2>
        <ProfileThemeFields
          name={name}
          avatarUrl={avatarUrl}
          initialFont={initial?.theme_font}
          initialAccent={initial?.theme_accent}
          initialBg={initial?.theme_bg}
        />
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-serif text-lg text-fg">Angeheftete Beiträge</h2>
          <p className="text-xs text-muted">Bis zu {MAX_PINNED} Beiträge erscheinen ganz oben in deinem Profil.</p>
        </div>
        {postChoices.length === 0 ? (
          <p className="text-sm text-muted">Du hast noch keine Beiträge.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {postChoices.map((p) => {
              const checked = pinned.includes(p.id);
              return (
                <label
                  key={p.id}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                    checked ? "bg-surface-2 text-fg" : "text-fg-soft hover:bg-surface-2"
                  }`}
                >
                  <input
                    type="checkbox"
                    name="pinned"
                    value={p.id}
                    checked={checked}
                    disabled={!checked && pinned.length >= MAX_PINNED}
                    onChange={() => togglePinned(p.id)}
                  />
                  <span className="truncate">{p.label}</span>
                </label>
              );
            })}
          </div>
        )}
      </section>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-accent-strong px-5 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Speichere..." : "Speichern"}
      </button>
    </form>
  );
}
