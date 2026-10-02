"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ERROR_MESSAGES: Record<string, string> = {
  "Invalid login credentials": "Benutzername/E-Mail oder Passwort falsch.",
};

export async function login(_prevState: string | null, formData: FormData) {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();

  let email = identifier;
  if (!identifier.includes("@")) {
    // Die Auflösung Benutzername -> E-Mail ist nur mit dem Server-Geheimnis erlaubt (sonst könnte jede Person
    // E-Mail-Adressen abfragen). Fehlt es oder passt es nicht, greift vorübergehend die alte Funktion (siehe
    // supabase/migration_security_hardening.sql: danach löschen).
    const secret = process.env.CRON_SECRET;
    let resolved: string | null = null;
    let failed = !secret;
    if (secret) {
      const res = await supabase.rpc("get_email_for_username", { p_username: identifier, p_secret: secret });
      if (res.error) failed = true;
      else resolved = res.data;
    }
    if (failed) {
      const legacy = await supabase.rpc("get_email_for_username", { p_username: identifier });
      resolved = legacy.data;
    }
    if (!resolved) return "Benutzername/E-Mail oder Passwort falsch.";
    email = resolved;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return ERROR_MESSAGES[error.message] ?? error.message;
  }

  const next = String(formData.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}
