"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup } from "./actions";
import { useSearchParams } from "next/navigation";

export default function SignupPage() {
  const [error, formAction, pending] = useActionState(signup, null);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 font-serif text-3xl text-fg">Konto erstellen</h1>
      <p className="mb-6 text-sm text-muted">
        Tritt der Gruppe bei und leg gleich danach deinen ersten Charakter an.
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        {next && <input type="hidden" name="next" value={next} />}
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Benutzername
          <input
            type="text"
            name="username"
            required
            minLength={2}
            className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          E-Mail
          <input
            type="email"
            name="email"
            required
            className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Passwort
          <input
            type="password"
            name="password"
            required
            minLength={6}
            className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
          />
        </label>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-md bg-accent-strong px-4 py-2 font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Erstelle Konto..." : "Konto erstellen"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Schon dabei?{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="text-accent hover:underline">
          Anmelden
        </Link>
      </p>
    </div>
  );
}
