"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/error-state";

// Fängt unerwartete Fehler aus allen Routen ohne eigene error.tsx ab
// (error-boundaries bubblen bis zur nächsten vorhandenen hoch).
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorState onRetry={retry} digest={error.digest} />;
}
