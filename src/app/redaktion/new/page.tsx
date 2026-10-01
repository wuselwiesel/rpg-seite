import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAllMentionableCharacters } from "@/lib/redaktion";
import { NewRedaktionPostForm } from "./new-redaktion-post-form";

export default async function NewRedaktionPostPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const mentionCharacters = await getAllMentionableCharacters(user.id);

  return <NewRedaktionPostForm mentionCharacters={mentionCharacters} />;
}
