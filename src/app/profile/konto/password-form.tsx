"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePassword } from "../actions";

const field =
  "w-full rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none transition focus:border-accent";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state === "ok") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex max-w-sm flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Neues Passwort
        <input type="password" name="password" autoComplete="new-password" minLength={6} required className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Passwort wiederholen
        <input type="password" name="confirm" autoComplete="new-password" minLength={6} required className={field} />
      </label>
      {state && state !== "ok" && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{state}</p>}
      {state === "ok" && <p role="status" className="text-sm text-accent">Passwort geändert.</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Speichere..." : "Passwort ändern"}
      </button>
    </form>
  );
}
