"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { pwnedPasswordError } from "@/lib/pwned-password";
import { cleanTokenHash } from "@/lib/recovery-token";

const INVALID_LINK = "Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.";

// Der Link aus der Mail wird erst beim Absenden eingelöst (nicht beim Öffnen), damit Mail-Scanner, die Links vorab abrufen,
// ihn nicht verbrauchen.
export async function setNewPassword(_prevState: string | null, formData: FormData): Promise<string | null> {
  const token = cleanTokenHash(formData.get("token_hash"));
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!token) return INVALID_LINK;
  if (password.length < 6) return "Das Passwort braucht mindestens 6 Zeichen.";
  if (password !== confirm) return "Die beiden Passwörter sind nicht gleich.";
  const pwned = await pwnedPasswordError(password);
  if (pwned) return pwned;

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: token });
  if (verifyError) return INVALID_LINK;

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (/same.*password|different from the old/i.test(error.message)) return "Das neue Passwort muss sich vom alten unterscheiden. Fordere bei Bedarf einen neuen Link an.";
    return error.message;
  }
  redirect("/");
}
