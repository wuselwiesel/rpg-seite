"use server";

import { cookies } from "next/headers";
import { createClient as createJsClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getOfficialAccountId, isAppAdmin } from "@/lib/account-marks";
import { clearAltSession, readAltSession, writeAltSession } from "@/lib/account-switch";

// Das offizielle Konto einmal verknüpfen (E-Mail und Passwort, nur für App-Admins). Danach genügt ein Tipp zum Wechseln.
export async function linkOfficialAccount(_prev: string | null, formData: FormData): Promise<string | null> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return "Bitte E-Mail und Passwort eingeben.";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  if (!(await isAppAdmin())) return "Das dürfen nur App-Admins.";
  const officialId = await getOfficialAccountId();
  if (!officialId) return "Es gibt noch kein offizielles Konto.";

  // Eigener Client ohne Cookies: Die aktuelle Sitzung bleibt unberührt
  const temp = createJsClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await temp.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) return "E-Mail oder Passwort stimmt nicht.";
  if (data.user.id !== officialId) return "Das ist nicht das offizielle Wortwinkel-Konto.";

  const { data: profile } = await temp.from("profiles").select("username, nickname").eq("id", data.user.id).maybeSingle<{ username: string; nickname: string | null }>();
  await writeAltSession({ a: data.session.access_token, r: data.session.refresh_token, u: profile?.nickname || profile?.username || "Wortwinkel" });
  return null;
}

// Zwischen dem eigenen und dem verknüpften Konto wechseln; die beiden Sitzungen tauschen die Plätze.
// Der Aufrufer lädt danach die Seite neu (harter Wechsel), damit nichts vom alten Konto im Browser hängen bleibt.
export async function switchAccount(): Promise<string | null> {
  const alt = await readAltSession();
  if (!alt) return "Es ist kein zweites Konto verknüpft.";

  const supabase = await createClient();
  const {
    data: { session: current },
  } = await supabase.auth.getSession();
  if (!current) return "Nicht angemeldet.";
  const { data: me } = await supabase.from("profiles").select("username, nickname").eq("id", current.user.id).maybeSingle<{ username: string; nickname: string | null }>();

  const { data, error } = await supabase.auth.setSession({ access_token: alt.a, refresh_token: alt.r });
  if (error || !data.session) {
    await clearAltSession();
    return "Die Verknüpfung ist abgelaufen. Bitte verknüpfe das Konto neu.";
  }
  await writeAltSession({ a: current.access_token, r: current.refresh_token, u: me?.nickname || me?.username || "Hauptkonto" });
  // Konto-bezogene Auswahl (aktive Welt, aktiver Charakter) gehört zum bisherigen Konto
  const jar = await cookies();
  jar.delete("active_character_id");
  jar.delete("active_world_id");
  return null;
}

export async function unlinkAccount(): Promise<void> {
  await clearAltSession();
}
