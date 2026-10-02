"use server";

import { createClient } from "@/lib/supabase/server";
import type { ChatKind, ChatTheme } from "@/lib/chat-theme";

const HEX = /^#[0-9a-fA-F]{6}$/;
const clean = (v: string | null) => (v && HEX.test(v) ? v : null);

// theme = null setzt auf die Standardfarben zurück.
export async function saveChatTheme(kind: ChatKind, chatId: string, theme: ChatTheme | null): Promise<string | null> {
  if (kind !== "account" && kind !== "rp") return "Ungültiger Chat.";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const main = clean(theme?.main ?? null);
  const accent = clean(theme?.accent ?? null);
  const bg = clean(theme?.bg ?? null);

  if (!main && !accent && !bg) {
    const { error } = await supabase
      .from("chat_themes")
      .delete()
      .eq("user_id", user.id)
      .eq("chat_kind", kind)
      .eq("chat_id", chatId);
    return error?.message ?? null;
  }
  const { error } = await supabase.from("chat_themes").upsert({
    user_id: user.id,
    chat_kind: kind,
    chat_id: chatId,
    main,
    accent,
    bg,
    updated_at: new Date().toISOString(),
  });
  return error?.message ?? null;
}
