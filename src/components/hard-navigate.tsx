"use client";

import { useEffect } from "react";
import { RowListSkeleton } from "@/components/skeleton";

// Echter Seitenaufruf statt Router-Navigation (für Route-Handler, die Cookies setzen und weiterleiten)
export function HardNavigate({ href }: { href: string }) {
  useEffect(() => {
    window.location.replace(href);
  }, [href]);
  return <RowListSkeleton />;
}
