import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Friendship } from "@/lib/types";
import { AddFriendForm } from "./add-friend-form";
import { FriendRequestActions } from "./friend-request-actions";

export default async function FriendsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: friendships } = await supabase
    .from("friendships")
    .select("*, requester:requester_id(*), addressee:addressee_id(*)")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .returns<Friendship[]>();

  const incoming = (friendships ?? []).filter(
    (f) => f.status === "pending" && f.addressee_id === user.id,
  );
  const outgoing = (friendships ?? []).filter(
    (f) => f.status === "pending" && f.requester_id === user.id,
  );
  const accepted = (friendships ?? []).filter((f) => f.status === "accepted");

  return (
    <div className="mx-auto max-w-2xl xl:max-w-3xl 2xl:max-w-4xl px-4 py-10">
      <h1 className="mb-1 font-serif text-3xl text-fg">Freund:innen</h1>
      <p className="mb-6 text-sm text-muted">
        Nur Freund:innen sehen deine Beiträge im Feed.
      </p>

      <div className="mb-8 rounded-2xl bg-surface p-4">
        <AddFriendForm />
      </div>

      {incoming.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-serif text-xl text-fg">Anfragen</h2>
          <ul className="flex flex-col gap-2">
            {incoming.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3"
              >
                <span className="text-sm text-fg">@{f.requester?.username}</span>
                <FriendRequestActions friendshipId={f.id} mode="incoming" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-3 font-serif text-xl text-fg">
          Freund:innen {accepted.length > 0 ? `(${accepted.length})` : ""}
        </h2>
        {accepted.length === 0 ? (
          <p className="text-sm text-muted">Noch keine Freund:innen hinzugefügt.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {accepted.map((f) => {
              const friend = f.requester_id === user.id ? f.addressee : f.requester;
              return (
                <li
                  key={f.id}
                  className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3"
                >
                  <span className="text-sm text-fg">@{friend?.username}</span>
                  <FriendRequestActions friendshipId={f.id} mode="accepted" />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {outgoing.length > 0 && (
        <section>
          <h2 className="mb-3 font-serif text-xl text-fg">Ausstehend</h2>
          <ul className="flex flex-col gap-2">
            {outgoing.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3"
              >
                <span className="text-sm text-fg">@{f.addressee?.username}</span>
                <FriendRequestActions friendshipId={f.id} mode="outgoing" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
