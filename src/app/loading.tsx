"use client";

import { usePathname } from "next/navigation";
import { FeedSkeleton, ListPageSkeleton } from "@/components/skeleton";

// Feed bekommt einen Platzhalter in Beitragsform, alle anderen Seiten die allgemeine Liste.
export default function Loading() {
  return usePathname() === "/" ? <FeedSkeleton /> : <ListPageSkeleton />;
}
