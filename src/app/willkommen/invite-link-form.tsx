"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseInviteLink, parseInviteToken } from "@/lib/invite-link";

export function InviteLinkForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const id = parseInviteLink(value);
        if (!id) return setError(true);
        const token = parseInviteToken(value);
        router.push(`/worlds/join/${id}${token ? `?t=${token}` : ""}`);
      }}
      className="flex flex-col gap-1"
    >
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
          placeholder="Einladungslink einfügen"
          aria-label="Einladungslink einfügen"
          aria-invalid={error}
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-fg outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent"
        >
          Öffnen
        </button>
      </div>
      {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">Das ist kein Einladungslink.</p>}
    </form>
  );
}
