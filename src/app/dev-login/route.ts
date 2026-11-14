import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { appUrl } from "@/lib/app-url";

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new Response("Not found", { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  // ?user=2 meldet das zweite Testkonto an (E2E_USERNAME_2 / E2E_PASSWORD_2), z. B. um Benachrichtigungen zwischen zwei Konten zu prüfen
  const second = searchParams.get("user") === "2";
  const username = second ? process.env.E2E_USERNAME_2 : process.env.E2E_USERNAME;
  const password = second ? process.env.E2E_PASSWORD_2 : process.env.E2E_PASSWORD;
  const secret = process.env.CRON_SECRET;

  if (!username || !password || !secret) {
    return new Response(second ? "E2E_USERNAME_2, E2E_PASSWORD_2 oder CRON_SECRET fehlt in .env.local" : "E2E_USERNAME, E2E_PASSWORD oder CRON_SECRET fehlt in .env.local", { status: 500 });
  }

  const next = searchParams.get("next") ?? "/";
  const target = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  const cookieStore = await cookies();
  const setCookies: { name: string; value: string; options: Record<string, unknown> }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          setCookies.push(...cookiesToSet);
        },
      },
    },
  );

  const { data: email, error: lookupError } = await supabase.rpc("get_email_for_username", {
    p_username: username,
    p_secret: secret,
  });
  if (lookupError || !email) {
    return new Response("Benutzername konnte nicht aufgelöst werden", { status: 500 });
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return new Response(error.message, { status: 500 });
  }

  const response = NextResponse.redirect(appUrl(request, target));
  for (const { name, value, options } of setCookies) {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
  }
  return response;
}
