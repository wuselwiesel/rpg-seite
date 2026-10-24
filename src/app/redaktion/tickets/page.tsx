import { Inbox } from "lucide-react";
import { Suspense } from "react";
import { TicketList } from "./ticket-list";
import { ListSkeleton } from "./ticket-skeleton";

export const metadata = { title: "Feedback" };

export default function TicketsPage() {
  return (
    <>
      <div className="mx-auto max-w-2xl py-6 lg:hidden">
        <Suspense fallback={<ListSkeleton />}>
          <TicketList />
        </Suspense>
      </div>
      <div className="hidden h-full min-h-dvh flex-col items-center justify-center gap-3 text-muted lg:flex">
        <Inbox className="h-10 w-10" strokeWidth={1.5} />
        <p className="text-sm">Wähle links ein Ticket aus.</p>
      </div>
    </>
  );
}
