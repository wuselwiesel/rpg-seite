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
    const { data } = await supabase.rpc("get_email_for_username", {
      p_username: identifier,
    });
    if (!data) return "Benutzername/E-Mail oder Passwort falsch.";
    email = data;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return ERROR_MESSAGES[error.message] ?? error.message;
  }

  redirect("/");
}
