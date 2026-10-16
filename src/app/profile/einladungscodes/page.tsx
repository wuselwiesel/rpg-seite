import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAppAdmin } from "@/lib/account-marks";
import { CodeManager, type CodeRow } from "./code-manager";

export const metadata = { title: "Einladungscodes" };

// Registrierung nur mit Einladungscode: hier erzeugt die Betreiberin Codes und sieht, wie oft sie genutzt wurden
export default async function SignupCodesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isAppAdmin())) notFound();

  const { data } = await supabase.from("signup_codes").select("code, label, max_uses, uses, active, created_at").order("created_at", { ascending: false }).returns<CodeRow[]>();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const origin = host ? `${h.get("x-forwarded-proto") ?? "https"}://${host}` : "";

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-serif text-2xl text-fg">Einladungscodes</h2>
      <CodeManager codes={data ?? []} origin={origin} />
    </div>
  );
}
