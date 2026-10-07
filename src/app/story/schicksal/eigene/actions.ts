"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { MAX_CUSTOM_FATES_PER_WORLD, analyzeFateText, cleanRoles, isFateCategory, isFateSeverity, type CustomRoles } from "@/lib/fate-custom";

type Input = { text: string; category: string; severity: string; roles?: CustomRoles };

function check(input: Input): { error: string } | { text: string; targets: 0 | 1 | 2; category: string; severity: string; roles: CustomRoles } {
  if (!isFateCategory(input.category)) return { error: "Bitte eine Kategorie wählen." };
  if (!isFateSeverity(input.severity)) return { error: "Bitte einen Schweregrad wählen." };
  const analyzed = analyzeFateText(input.text);
  if ("error" in analyzed) return analyzed;
  return { ...analyzed, category: input.category, severity: input.severity, roles: cleanRoles(input.roles, analyzed.targets) };
}

export async function addCustomFate(input: Input): Promise<string | null> {
  const parsed = check(input);
  if ("error" in parsed) return parsed.error;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const world = await getActiveWorld(user.id);
  if (!world) return "Wähle zuerst eine Welt.";

  const { count } = await supabase.from("world_custom_fates").select("id", { count: "exact", head: true }).eq("world_id", world.id);
  if ((count ?? 0) >= MAX_CUSTOM_FATES_PER_WORLD) return `Pro Welt sind höchstens ${MAX_CUSTOM_FATES_PER_WORLD} eigene Schicksale möglich.`;

  const { error } = await supabase.from("world_custom_fates").insert({ world_id: world.id, created_by: user.id, ...parsed });
  if (error) return error.message;
  revalidatePath("/story/schicksal/eigene");
  return null;
}

export async function updateCustomFate(id: string, input: Input): Promise<string | null> {
  const parsed = check(input);
  if ("error" in parsed) return parsed.error;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { error, count } = await supabase.from("world_custom_fates").update(parsed, { count: "exact" }).eq("id", id);
  if (error) return error.message;
  if (!count) return "Das darfst du nicht ändern.";
  revalidatePath("/story/schicksal/eigene");
  return null;
}

export async function deleteCustomFate(id: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { error, count } = await supabase.from("world_custom_fates").delete({ count: "exact" }).eq("id", id);
  if (error) return error.message;
  if (!count) return "Konnte nicht gelöscht werden.";
  revalidatePath("/story/schicksal/eigene");
  return null;
}
