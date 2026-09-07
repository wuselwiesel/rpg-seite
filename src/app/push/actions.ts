"use server";

import { createClient } from "@/lib/supabase/server";

export async function savePushSubscription(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { data: existing } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("endpoint", subscription.endpoint)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("push_subscriptions")
      .update({
        user_id: user.id,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      })
      .eq("id", existing.id);
    return error?.message ?? null;
  }

  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: user.id,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  });
  return error?.message ?? null;
}

export async function removePushSubscription(endpoint: string) {
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}
