"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup } from "./actions";

export default function SignupPage() {
  const [error, formAction, pending] = useActionState(signup, null);

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 font-serif text-3xl text-stone-100">Konto erstellen</h1>
      <p className="mb-6 text-sm text-stone-400">
        Tritt der Gruppe bei und leg gleich danach deinen ersten Charakter an.
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-stone-300">
          Benutzername
          <input
            type="text"
            name="username"
            required
            minLength={2}
            className="rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 outline-none focus:border-amber-600"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-stone-300">
          E-Mail
          <input
            type="email"
            name="email"
            required
            className="rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 outline-none focus:border-amber-600"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-stone-300">
          Passwort
          <input
            type="password"
            name="password"
            required
            minLength={6}
            className="rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 outline-none focus:border-amber-600"
          />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-md bg-amber-700 px-4 py-2 font-medium text-stone-50 transition hover:bg-amber-600 disabled:opacity-50"
        >
          {pending ? "Erstelle Konto..." : "Konto erstellen"}
        </button>
      </form>

      <p className="mt-6 text-sm text-stone-400">
        Schon dabei?{" "}
        <Link href="/login" className="text-amber-500 hover:underline">
          Anmelden
        </Link>
      </p>
    </div>
  );
}
