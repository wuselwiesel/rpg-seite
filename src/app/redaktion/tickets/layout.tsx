import { TicketList } from "./ticket-list";

// Postfach wie bei E-Mail: links die Liste, rechts das geöffnete Ticket (am Handy erst die Liste, dann das Ticket)
export default function TicketsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg:flex lg:h-dvh">
      <aside className="hidden w-80 shrink-0 overflow-y-auto border-r border-line py-6 lg:block">
        <TicketList />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
