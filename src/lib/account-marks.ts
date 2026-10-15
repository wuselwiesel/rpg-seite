import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Konto-Markierungen (Tabelle account_marks): nur der Betreiber vergibt sie per SQL. Alles hier ist tolerant: Fehlt die Tabelle
// (Migration noch nicht eingespielt), gibt es einfach weder Siegel noch Admin-Rechte.

// Ist das angemeldete Konto App-Admin (darf den Überblick sehen und als Wortwinkel schreiben)?
export const isAppAdmin = cache(async (): Promise<boolean> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_app_admin");
  return !error && data === true;
});

// Id des offiziellen Wortwinkel-Kontos (null, solange es keins gibt)
export const getOfficialAccountId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("official_account_id");
  return !error && typeof data === "string" ? data : null;
});
