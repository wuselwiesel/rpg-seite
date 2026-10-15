"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseAvailability, parseLocation } from "@/lib/availability";

// Besitzer:in (bei NPCs auch Admins) setzt Verfügbarkeit und Aufenthaltsort; die Policies der Charaktere erzwingen das
export async function setCharacterAvailability(characterId: string, availability: string | null, location: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { data, error } = await supabase
    .from("characters")
    .update({ availability: parseAvailability(availability), location: parseLocation(location) })
    .eq("id", characterId)
    .select("id, world_id");
  if (error) return error.message;
  if (!data?.length) return "Das darf nur die Besitzer:in des Charakters.";
  revalidatePath(`/characters/${characterId}`);
  revalidatePath("/story/charaktere");
  revalidatePath(`/worlds/${data[0].world_id as string}/charaktere`);
  return null;
}
