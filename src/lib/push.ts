import "server-only";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";
import { shouldSuppressPush } from "@/lib/notification-prefs";

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails("mailto:chronik@example.com", publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url: string; tag?: string },
  target: { recipientName?: string | null; recipientCharacterId?: string | null; type?: string } = {},
) {
  if (!ensureVapidConfigured()) return;
  if (await shouldSuppressPush(userId, target)) return;

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_push_subscriptions", { p_user_id: userId });
  const subscriptions = data as { endpoint: string; p256dh: string; auth: string }[] | null;
  if (!subscriptions?.length) return;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.rpc("delete_stale_push_subscription", { p_endpoint: sub.endpoint });
        }
      }
    }),
  );
}
