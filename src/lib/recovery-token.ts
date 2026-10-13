// Token aus dem Link der Passwort-vergessen-Mail (`token_hash`): nur unverfänglich aussehende Werte durchlassen.
export function cleanTokenHash(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  return /^[A-Za-z0-9_-]{16,128}$/.test(value) ? value : null;
}
