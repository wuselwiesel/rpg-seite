"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Einladungscodes für die Registrierung (nur App-Admins; die Datenbank prüft das bei jedem Aufruf)
export async function createSignupCode(label: string, maxUses: number): Promise<{ code?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_signup_code", { p_label: label.trim().slice(0, 60), p_max_uses: Math.max(1, Math.min(1000, Math.round(maxUses) || 1)) });
  if (error) return { error: error.message };
  revalidatePath("/profile/einladungscodes");
  return { code: String(data) };
}

export async function setSignupCodeActive(code: string, active: boolean): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_signup_code_active", { p_code: code, p_active: active });
  if (error) return error.message;
  revalidatePath("/profile/einladungscodes");
  return null;
}
