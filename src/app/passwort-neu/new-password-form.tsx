"use client";

import { useActionState } from "react";
import Link from "next/link";
import { setNewPassword } from "./actions";

export function NewPasswordForm({ token }: { token: string | null }) {
  const [error, formAction, pending] = useActionState(setNewPassword, null);

  if (!token) {
    return (
      <>
        <p className="mb-6 mt-3 text-sm text-fg-soft">Der Link ist ungültig oder abgelaufen.</p>
        <Link href="/passwort-vergessen" className="text-sm text-accent hover:underline">
          Neuen Link anfordern
        </Link>
      </>
    );
  }

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="token_hash" value={token} />
      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Neues Passwort
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={6}
          className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Passwort wiederholen
        <input
          type="password"
          name="confirm"
          autoComplete="new-password"
          required
          minLength={6}
          className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
        />
      </label>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {error}
          {error.startsWith("Der Link") && (
            <>
              {" "}
              <Link href="/passwort-vergessen" className="underline">
                Neuen Link anfordern
              </Link>
            </>
          )}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md bg-accent-strong px-4 py-2 font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Speichere..." : "Passwort speichern"}
      </button>
    </form>
  );
}
