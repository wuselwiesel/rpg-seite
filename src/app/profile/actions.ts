"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(_prevState: string | null, formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const nickname = String(formData.get("nickname") ?? "").trim();
  const avatarUrl = String(formData.get("avatar_url") ?? "").trim();

  if (username.length < 2) {
    return "Bitte einen Benutzernamen mit mindestens 2 Zeichen angeben.";
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { data: available } = await supabase.rpc("username_available", {
    p_username: username,
    p_exclude_id: user.id,
  });
  if (available === false) {
    return "Dieser Benutzername ist bereits vergeben.";
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      username,
      nickname: nickname || null,
      avatar_url: avatarUrl || null,
    })
    .eq("id", user.id);

  if (error) return error.message;

  revalidatePath("/", "layout");
  redirect("/profile?saved=1");
}
