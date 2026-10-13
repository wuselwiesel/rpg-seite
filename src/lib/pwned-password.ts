import { createHash } from "node:crypto";

export const PWNED_MESSAGE = "Dieses Passwort stammt aus bekannten Datenlecks. Bitte wähle ein anderes.";

type FetchLike = (url: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }) => Promise<{ ok: boolean; text: () => Promise<string> }>;

// Wie oft taucht das Passwort in bekannten Datenlecks auf (Have I Been Pwned, k-Anonymität: nur die ersten 5 Zeichen des
// SHA-1-Hashes verlassen den Server, nie das Passwort)? null, wenn die Prüfung nicht möglich war.
export async function pwnedCount(password: string, fetchFn: FetchLike = fetch as unknown as FetchLike): Promise<number | null> {
  if (!password) return 0;
  const hash = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  try {
    const res = await fetchFn(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    for (const line of (await res.text()).split(/\r?\n/)) {
      const [candidate, count] = line.trim().split(":");
      if (candidate === suffix) return Number.parseInt(count ?? "0", 10) || 0;
    }
    return 0;
  } catch {
    return null;
  }
}

// Meldung, wenn das Passwort bekannt geleakt ist; sonst null (auch wenn der Dienst nicht erreichbar war).
export async function pwnedPasswordError(password: string, fetchFn?: FetchLike): Promise<string | null> {
  const count = await pwnedCount(password, fetchFn);
  return count !== null && count > 0 ? PWNED_MESSAGE : null;
}
