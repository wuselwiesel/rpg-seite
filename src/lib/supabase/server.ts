import { createServerClient } from "@supabase/ssr";
import { cache } from "react";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";

// Ein Client pro Request. `auth.getUser()` prüft das JWT lokal (getClaims) statt bei jedem
// Aufruf einen Netzwerk-Roundtrip zu Supabase Auth zu machen; die Sitzung selbst wird im Proxy erneuert.
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component - ignored because middleware
            // refreshes the session on every request anyway.
          }
        },
      },
    },
  );

  const fetchUser = client.auth.getUser.bind(client.auth);
  client.auth.getUser = (async (jwt?: string) => {
    if (jwt) return fetchUser(jwt);
    const { data, error } = await client.auth.getClaims();
    if (error || !data?.claims?.sub) return { data: { user: null }, error: error ?? null };
    const c = data.claims;
    const user = { id: c.sub, email: c.email, aud: c.aud, role: c.role } as unknown as User;
    return { data: { user }, error: null };
  }) as typeof client.auth.getUser;

  return client;
});
