"use client";

import { useState, useTransition } from "react";
import { ArrowLeftRight } from "lucide-react";
import { switchAccount } from "@/app/profile/wortwinkel/actions";

// Ein Tipp: zum verknüpften Konto wechseln. Danach wird die Seite hart neu geladen, damit nichts vom anderen Konto hängen bleibt.
export function SwitchAccountButton({ label, className, iconClassName = "h-[18px] w-[18px] shrink-0" }: { label: string; className?: string; iconClassName?: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const err = await switchAccount();
            if (err) setError(err);
            else window.location.href = "/";
          });
        }}
        className={className}
      >
        <ArrowLeftRight className={iconClassName} strokeWidth={2} />
        {pending ? "Wechsle …" : `Zu ${label} wechseln`}
      </button>
      {error && (
        <p role="alert" className="px-3 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </>
  );
}
