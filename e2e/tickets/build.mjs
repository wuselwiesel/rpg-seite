import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { genericStubs } from "../_shared/generic-stubs.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const out = path.join(here, ".build");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(
  path.join(out, "shim-nav.ts"),
  `export const useRouter = () => ({ refresh() { (window as any).__calls.push(["refresh"]); }, push(p: string) { (window as any).__calls.push(["push", p]); } });
export const usePathname = () => (window as any).__path ?? "/redaktion/tickets";`,
);
fs.writeFileSync(
  path.join(out, "stub-actions.ts"),
  `const rec = (name: string, ...a: unknown[]) => (window as any).__calls.push([name, ...a]);
export async function createTicket(input: unknown) { rec("create", input); return (window as any).__fail ? { error: "Zu viele Meldungen." } : { id: "00000000-0000-4000-8000-000000000099" }; }
export async function addTicketComment(...a: unknown[]) { rec("comment", ...a); return null; }
export async function setTicketStatus(...a: unknown[]) { rec("status", ...a); return null; }
export async function setTicketTriage(...a: unknown[]) { rec("triage", ...a); return null; }
export async function mergeTicket(...a: unknown[]) { rec("merge", ...a); return null; }
export async function markTicketRead(...a: unknown[]) { rec("read", ...a); }`,
);
fs.writeFileSync(
  path.join(out, "stub-upload.ts"),
  `export const MAX_TICKET_IMAGES = 4;
export async function uploadTicketImages(files: File[]) { (window as any).__calls.push(["upload", files.length]); return { paths: files.map((_, i) => "u/" + i + ".png") }; }
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
export async function signTicketImages(paths: string[]) { return Object.fromEntries(paths.map((p) => [p, PNG])); }`,
);
// Live-Kanal: Handler merken, der Test löst Ereignisse mit window.__emit aus
fs.writeFileSync(
  path.join(out, "stub-client.ts"),
  `(window as any).__handlers = [];
(window as any).__emit = (table: string, event: string, row: unknown) => (window as any).__handlers.filter((h: any) => h.table === table && h.event === event).forEach((h: any) => h.cb({ new: row }));
export const createClient = () => {
  const channel: any = {
    on(_t: string, f: { table: string; event: string }, cb: unknown) { (window as any).__handlers.push({ table: f.table, event: f.event, cb }); return channel; },
    subscribe() { return channel; },
  };
  const q: any = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: { username: "admin", nickname: "Betreiberin" } }) };
  return { channel: () => channel, removeChannel() {}, from: () => q };
};`,
);
const stubs = {
  name: "stubs",
  setup(b) {
    b.onResolve({ filter: /\.\.\/actions$/ }, () => ({ path: path.join(out, "stub-actions.ts") }));
    b.onResolve({ filter: /lib\/ticket-upload$/ }, () => ({ path: path.join(out, "stub-upload.ts") }));
    b.onResolve({ filter: /supabase\/client$/ }, () => ({ path: path.join(out, "stub-client.ts") }));
  },
};
await build({
  entryPoints: [path.join(here, "harness.tsx")], bundle: true, outfile: path.join(out, "out.js"), format: "iife", jsx: "automatic",
  alias: { "@": path.join(root, "src"), "next/navigation": path.join(out, "shim-nav.ts") },
  nodePaths: [path.join(root, "node_modules")], plugins: [stubs, genericStubs(root)], banner: { js: "var process = { env: {} };" }, logLevel: "error",
});
const cssFile = path.join(root, "src", "app", "globals.css");
const css = await postcss([tailwind()]).process(fs.readFileSync(cssFile, "utf8"), { from: cssFile });
fs.writeFileSync(path.join(out, "style.css"), css.css);
fs.writeFileSync(path.join(out, "index.html"), `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="style.css"><body style="background:var(--app);margin:0"><script>window.__calls=[]</script><div id="root"></div><script src="out.js"></script>`);
