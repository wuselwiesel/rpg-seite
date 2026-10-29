// Adresse der App aus Sicht der Besucher:in. Hinter dem Proxy (Hetzner/Coolify) hört der Server auf
// HOSTNAME=0.0.0.0, und `request.url` lautet dann „http://0.0.0.0:3000/…“ – Weiterleitungen darauf laufen ins Leere.
// Deshalb zuerst die Weiterleitungs-Header des Proxys nehmen, sonst den Host-Header, zuletzt `request.url`.

type HeaderSource = { headers: { get(name: string): string | null }; url: string };

const first = (value: string | null) => value?.split(",")[0]?.trim() || null;

export function appOrigin(request: HeaderSource): string {
  const host = first(request.headers.get("x-forwarded-host")) ?? first(request.headers.get("host"));
  if (!host) return new URL(request.url).origin;
  const local = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(host);
  const proto = first(request.headers.get("x-forwarded-proto")) ?? (local ? "http" : new URL(request.url).protocol.replace(":", ""));
  return `${proto}://${host}`;
}

// Absolute Adresse eines Pfads (mit Abfrage) in der App, für `NextResponse.redirect`
export function appUrl(request: HeaderSource, path: string): URL {
  return new URL(path, appOrigin(request));
}
