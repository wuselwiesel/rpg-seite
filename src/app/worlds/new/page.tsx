"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createWorld } from "../actions";

export default function NewWorldPage() {
  const [error, formAction, pending] = useActionState(createWorld, null);
  const searchParams = useSearchParams();
  const isWelcome = searchParams.get("welcome") === "1";
  const [joinMode, setJoinMode] = useState("open");

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-1 font-serif text-3xl text-fg">
        {isWelcome ? "Willkommen! Erschaffe deine erste Welt" : "Neue Welt erschaffen"}
      </h1>
      <p className="mb-6 text-sm text-muted">
        Danach kannst du Freund:innen einladen und deinen ersten Charakter erstellen.
      </p>
      {isWelcome && (
        <p className="mb-6 text-sm text-muted">
          Gibt es die Welt schon?{" "}
          <Link href="/search?tab=worlds&welcome=1" className="text-accent hover:underline">
            Welt suchen und beitreten
          </Link>
        </p>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Name der Welt
          <input
            type="text"
            name="name"
            required
            placeholder="z. B. Aldenmark"
            className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Beschreibung (optional)
          <textarea
            name="description"
            rows={4}
            placeholder="Worum geht es in dieser Welt?"
            className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Erkunden vor dem Beitritt
          <select
            name="preview"
            defaultValue="none"
            className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
          >
            <option value="none">Aus</option>
            <option value="info">Willkommen, Wiki und Figuren</option>
            <option value="full">Alles, auch Szenen</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Beitritt
          <select
            name="join_mode"
            value={joinMode}
            onChange={(e) => setJoinMode(e.target.value)}
            className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
          >
            <option value="open">Offen</option>
            <option value="request">Auf Anfrage</option>
            <option value="invite">Nur auf Einladung</option>
          </select>
        </label>
        <label className="flex items-center gap-3 text-sm text-fg">
          <input
            type="checkbox"
            name="is_public"
            onChange={(e) => e.target.checked && setJoinMode((m) => (m === "open" ? "request" : m))}
            className="h-4 w-4 accent-[var(--accent-strong)]"
          />
          Öffentlich
        </label>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 self-start rounded-md bg-accent-strong px-5 py-2 font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Erschaffe..." : "Welt erschaffen"}
        </button>
      </form>
    </div>
  );
}
