"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_CHARACTER_COOKIE, ACTIVE_WORLD_COOKIE } from "@/lib/types";

// Konto endgültig löschen. Zur Sicherheit muss der Benutzername getippt werden. Besitzt die Person noch Welten mit
// anderen Mitgliedern, lehnt die Datenbank ab (erst Besitz übertragen).
export async function deleteAccount(confirmName: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle<{ username: string }>();
  if (!profile || confirmName.trim().toLowerCase() !== profile.username.toLowerCase()) {
    return "Der Benutzername stimmt nicht überein.";
  }

  const { error } = await supabase.rpc("delete_my_account");
  if (error) return error.message;

  await supabase.auth.signOut().catch(() => undefined);
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_WORLD_COOKIE);
  cookieStore.delete(ACTIVE_CHARACTER_COOKIE);
  redirect("/login?konto=geloescht");
}
