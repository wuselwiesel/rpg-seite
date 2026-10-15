import "server-only";
import { cookies } from "next/headers";

// Zweites Konto (das offizielle Wortwinkel-Konto) für App-Admins: Seine Sitzung liegt in einem eigenen, nur serverseitig lesbaren Cookie.
// Beim Wechseln tauschen die beiden Sitzungen die Plätze (siehe app/profile/wortwinkel/actions.ts).
export const ALT_SESSION_COOKIE = "ww_alt_session";

export type AltSession = { a: string; r: string; u: string };

export async function readAltSession(): Promise<AltSession | null> {
  const raw = (await cookies()).get(ALT_SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<AltSession>;
    if (typeof parsed.a === "string" && typeof parsed.r === "string" && typeof parsed.u === "string") return { a: parsed.a, r: parsed.r, u: parsed.u };
  } catch {
    /* ungültig */
  }
  return null;
}

export async function writeAltSession(session: AltSession): Promise<void> {
  (await cookies()).set(ALT_SESSION_COOKIE, Buffer.from(JSON.stringify(session), "utf8").toString("base64url"), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
}

export async function clearAltSession(): Promise<void> {
  (await cookies()).delete(ALT_SESSION_COOKIE);
}

// Name des verknüpften Kontos für die Anzeige („Zu … wechseln“), oder null
export async function getAltAccountLabel(): Promise<string | null> {
  return (await readAltSession())?.u ?? null;
}
