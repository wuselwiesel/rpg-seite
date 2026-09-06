"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "./actions";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(login, null);

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 font-serif text-3xl text-fg">Anmelden</h1>
      <p className="mb-6 text-sm text-muted">
        Willkommen zurück in der Geschichte.
      </p>

      <form action={formAction} className="flex flex-col gap-4">
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
            className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
          />
        </label>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-md bg-accent-strong px-4 py-2 font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Melde an..." : "Anmelden"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Noch keinen Charakter?{" "}
        <Link href="/signup" className="text-accent hover:underline">
          Konto erstellen
        </Link>
      </p>
    </div>
  );
}
