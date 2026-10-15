"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { linkOfficialAccount } from "./actions";

export function LinkOfficialAccountForm() {
  const router = useRouter();
  const [error, formAction, pending] = useActionState(async (prev: string | null, formData: FormData) => {
    const err = await linkOfficialAccount(prev, formData);
    if (!err) router.refresh();
    return err;
  }, null);

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        E-Mail des Wortwinkel-Kontos
        <input
          type="email"
          name="email"
          required
          autoComplete="off"
          className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Passwort
        <input
          type="password"
          name="password"
          required
          autoComplete="off"
          className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
        />
      </label>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-accent-strong px-5 py-2 font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Verknüpfe..." : "Verknüpfen"}
      </button>
    </form>
  );
}
