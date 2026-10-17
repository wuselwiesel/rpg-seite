import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ReportForm } from "./report-form";

export const metadata = { title: "Neues Ticket" };

export default async function NewTicketPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-xl px-4 py-6 sm:py-10 lg:h-dvh lg:overflow-y-auto">
      <Link href="/redaktion/tickets" className="mb-4 inline-flex items-center gap-1 text-sm text-muted transition hover:text-fg lg:hidden">
        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        Tickets
      </Link>
      <h2 className="mb-5 font-serif text-3xl text-fg">Neues Ticket</h2>
      <ReportForm />
    </div>
  );
}
