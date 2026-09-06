// Chat-Konversationen sollen auf Mobilgeräten den vollen Bildschirm nutzen
// (eigener Zurück-Link im Chat selbst) statt zusätzlich die globale
// Navigation (Topbar + Tabbar) einzublenden.
export function isImmersiveChatPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return /^\/chats\/(?!new(?:\/|$))[^/]+/.test(pathname);
}
