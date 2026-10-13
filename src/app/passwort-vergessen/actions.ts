"use server";

import { createClient } from "@/lib/supabase/server";

// Immer dieselbe Antwort, egal ob es das Konto gibt: so lässt sich nicht herausfinden, wer registriert ist.
export async function requestPasswordReset(_prevState: string | null, formData: FormData): Promise<string | null> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  if (!identifier) return "Bitte Benutzername oder E-Mail angeben.";

  const supabase = await createClient();
  let email: string | null = identifier.includes("@") ? identifier : null;
  if (!email) {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const { data } = await supabase.rpc("get_email_for_username", { p_username: identifier, p_secret: secret });
      email = typeof data === "string" && data ? data : null;
    }
  }
  if (email) {
    // Fehler (unbekannte Adresse, zu viele Anfragen) bewusst nicht anzeigen
    await supabase.auth.resetPasswordForEmail(email);
  }
  return "ok";
}
