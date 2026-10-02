import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Am Handy zeigt das Layout hier die Liste; am Desktop steht rechts nur ein Hinweis.
export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <p className="pt-2 text-sm text-muted">Wähle links einen Bereich aus.</p>;
}
