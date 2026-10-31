import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { HardNavigate } from "@/components/hard-navigate";

// Weiterleitung auf einen Route-Handler (z. B. /switch-character, setzt Cookies). Beim ersten Laden genügt `redirect`;
// bei einer Router-Navigation (Klick auf einen Link) rendert der Router das Ergebnis leer, dort braucht es einen echten Seitenaufruf.
// Der Router ruft die Seite per fetch ab (Sec-Fetch-Mode „cors“), ein normaler Seitenaufruf kommt als „navigate“.
// Seite: `return redirectToRoute(href)`.
export async function redirectToRoute(href: string) {
  const mode = (await headers()).get("sec-fetch-mode");
  if (mode && mode !== "navigate") return <HardNavigate href={href} />;
  redirect(href);
}
