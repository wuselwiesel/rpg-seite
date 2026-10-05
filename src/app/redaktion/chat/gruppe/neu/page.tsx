import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAcceptedFriends } from "@/lib/friends";
import { NewGroupForm } from "./new-group-form";

export default async function NewAccountGroupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const friends = (await getAcceptedFriends(user.id)).filter(Boolean);
  return (
    <div className="mx-auto max-w-xl px-4 py-6 lg:px-6">
      <NewGroupForm
        friends={friends.map((f) => ({ id: f.id, name: f.nickname || f.username, avatarUrl: f.avatar_url }))}
      />
    </div>
  );
}
