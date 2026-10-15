"use server";

import { isReservedAccountName } from "@/lib/reserved-account-names";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { pwnedPasswordError } from "@/lib/pwned-password";

export async function signup(_prevState: string | null, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const username = String(formData.get("username") ?? "").trim();

  if (username.length < 2) {
    return "Bitte einen Benutzernamen mit mindestens 2 Zeichen angeben.";
  }

  if (isReservedAccountName(username)) return "Dieser Benutzername ist dem offiziellen Konto vorbehalten. Bitte wähle einen anderen.";

  const pwned = await pwnedPasswordError(password);
  if (pwned) return pwned;

  const supabase = await createClient();

  const { data: available } = await supabase.rpc("username_available", {
    p_username: username,
  });
  if (available === false) {
    return "Dieser Benutzername ist bereits vergeben.";
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username, intro_public: formData.get("intro_public") === "on" } },
  });

  if (error) {
    return error.message;
  }

  const next = String(formData.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/willkommen");
}
