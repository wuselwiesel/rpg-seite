"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "./actions";

export default function ForgotPasswordPage() {
  const [result, formAction, pending] = useActionState(requestPasswordReset, null);
  const sent = result === "ok";

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 font-serif text-3xl text-fg">Passwort vergessen</h1>

      {sent ? (
        <>
          <p className="mb-6 mt-3 text-sm text-fg-soft">Wenn es dazu ein Konto gibt, ist eine E-Mail mit einem Link unterwegs.</p>
          <Link href="/login" className="text-sm text-accent hover:underline">
            Zur Anmeldung
          </Link>
        </>
      ) : (
        <form action={formAction} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-fg-soft">
            Benutzername oder E-Mail
            <input
              type="text"
              name="identifier"
              autoComplete="username"
              required
              className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
            />
          </label>

          {result && <p className="text-sm text-red-600 dark:text-red-400">{result}</p>}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-md bg-accent-strong px-4 py-2 font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Sende..." : "Link senden"}
          </button>
          <Link href="/login" className="text-sm text-muted hover:text-fg">
            Zurück zur Anmeldung
          </Link>
        </form>
      )}
    </div>
  );
}
