// Allgemeine Platzhalter für die Browser-Test-Harnesse: Alles, was die Harnesse nicht selbst ersetzen, aber nur auf dem Server
// läuft (Server-Aktionen, Supabase, web-push, next/headers …), wird hier durch Attrappen ersetzt. Als LETZTES Plugin eintragen,
// damit die eigenen Platzhalter einer Suite Vorrang behalten.
import fs from "node:fs";
import path from "node:path";

const SERVER_MODULES = {
  "web-push": ["setVapidDetails", "sendNotification", "generateVAPIDKeys"],
  "next/headers": ["cookies", "headers", "draftMode"],
  "next/cache": ["revalidatePath", "revalidateTag", "unstable_cache", "cacheLife", "cacheTag"],
  "next/server": ["NextResponse", "NextRequest", "after", "connection"],
};

export function genericStubs(root) {
  const proxy = `const chain: any = new Proxy(function () {}, { get(_t, k) { if (k === "then") return (res: any) => (typeof res === "function" ? res({ data: [], error: null }) : undefined); if (k === "presenceState") return () => ({}); return () => chain; }, apply() { return chain; } });`;
  return {
    name: "generic-stubs",
    setup(b) {
      b.onResolve({ filter: /^server-only$/ }, () => ({ path: "server-only", namespace: "empty" }));
      b.onLoad({ filter: /.*/, namespace: "empty" }, () => ({ contents: "export {}", loader: "js" }));

      b.onResolve({ filter: /^(web-push|next\/(headers|cache|server))$/ }, (a) => ({ path: a.path, namespace: "server-stub" }));
      b.onLoad({ filter: /.*/, namespace: "server-stub" }, (a) => ({
        contents: `const f: any = () => f; ${SERVER_MODULES[a.path].map((n) => `export const ${n}: any = f;`).join(" ")} export default f;`,
        loader: "ts",
      }));

      b.onResolve({ filter: /supabase\/(client|server)$|^@supabase\// }, () => ({ path: "supabase", namespace: "supabase-stub" }));
      b.onLoad({ filter: /.*/, namespace: "supabase-stub" }, () => ({
        contents: `${proxy} export const createClient = () => chain; export const createServerClient = () => chain; export const createBrowserClient = () => chain; export default chain;`,
        loader: "ts",
      }));

      // Server-Aktionen: jede exportierte Funktion der echten Datei wird zu einer Attrappe, die nichts tut
      b.onResolve({ filter: /(^|\/)([a-z-]+-)?actions$/ }, (a) => {
        const file = a.path.startsWith("@/") ? path.join(root, "src", a.path.slice(2)) : path.resolve(a.resolveDir, a.path);
        return fs.existsSync(file + ".ts") ? { path: file + ".ts", namespace: "action-stub" } : undefined;
      });
      b.onLoad({ filter: /.*/, namespace: "action-stub" }, (a) => {
        const src = fs.readFileSync(a.path, "utf8");
        const names = [...src.matchAll(/export (?:async )?(?:function|const) (\w+)/g)].map((m) => m[1]);
        return { contents: names.map((n) => `export const ${n} = async () => null;`).join("\n"), loader: "ts" };
      });
    },
  };
}
