import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const out = path.join(here, ".build");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "shim-link.tsx"), `import React from "react"; export default function Link({href, children, ...rest}: any){ return <a href={href} onClick={(e)=>e.preventDefault()} {...rest}>{children}</a>; }`);
fs.writeFileSync(path.join(out, "shim-nav.ts"), `export const usePathname = () => "/wiki"; export const useRouter = () => ({ push(u: string) { (window as any).__calls.push({ push: u }); }, refresh() {}, replace() {} });`);
fs.writeFileSync(
  path.join(out, "stub-actions.ts"),
  `const log = (e: unknown) => (window as any).__calls.push(e);
let n = 0;
export async function addMapPin(mapId: string, x: number, y: number, raw: any) { log({ add: { mapId, x, y, ...raw } }); return { ok: true, pin: { id: "new" + ++n, map_id: mapId, x, y, label: raw.label, icon: raw.icon || null, page_id: raw.pageId || null, target_map_id: raw.targetMapId || null } }; }
export async function movePin(id: string, x: number, y: number) { log({ move: { id, x, y } }); return { ok: true }; }
export async function updatePin(id: string, raw: any) { log({ update: { id, ...raw } }); return { ok: true, pin: { id, map_id: "m1", x: 0, y: 0, label: raw.label, icon: raw.icon || null, page_id: raw.pageId || null, target_map_id: raw.targetMapId || null } }; }
export async function deletePin(id: string) { log({ del: id }); return { ok: true }; }
export async function updateWikiMap(id: string, input: any) { log({ rename: { id, ...input } }); return { ok: true }; }
export async function deleteWikiMap(id: string) { log({ delMap: id }); return { ok: true }; }`,
);

fs.writeFileSync(path.join(out, "shim-dynamic.tsx"), `export default function dynamic() { return function Lazy(props: any) { return <div><button type="button" onClick={() => props.onPick("🦊")}>Katalog Fuchs</button><button type="button" onClick={() => props.onPick(":katze:")}>Katalog Katze</button></div>; }; }`);
fs.writeFileSync(path.join(out, "stub-supabase.ts"), `export const createClient = () => ({});`);
fs.writeFileSync(path.join(out, "stub-emoji-actions.ts"), `export async function createCustomEmoji() { return null; }`);
const stubs = {
  name: "stubs",
  setup(b) {
    b.onResolve({ filter: /supabase\/client$/ }, () => ({ path: path.join(out, "stub-supabase.ts") }));
    b.onResolve({ filter: /profile\/emojis\/actions$/ }, () => ({ path: path.join(out, "stub-emoji-actions.ts") }));
    b.onResolve({ filter: /^\.\.\/actions$/ }, (a) => (a.importer.includes("karten") ? { path: path.join(out, "stub-actions.ts") } : undefined));
  },
};

await build({
  entryPoints: [path.join(here, "harness.tsx")],
  bundle: true,
  outfile: path.join(out, "out.js"),
  format: "iife",
  jsx: "automatic",
  alias: { "@": path.join(root, "src"), "next/link": path.join(out, "shim-link.tsx"), "next/navigation": path.join(out, "shim-nav.ts"), "next/dynamic": path.join(out, "shim-dynamic.tsx") },
  nodePaths: [path.join(root, "node_modules")],
  plugins: [stubs],
  banner: { js: "var process = { env: {} };" },
  loader: { ".svg": "dataurl", ".png": "dataurl" },
  logLevel: "error",
});
// Echtes Stylesheet der App (Tailwind), damit Layout und Überlagerungen wie im Browser der Nutzerin sind.
const cssFile = path.join(root, "src", "app", "globals.css");
const css = await postcss([tailwind()]).process(fs.readFileSync(cssFile, "utf8"), { from: cssFile });
fs.writeFileSync(path.join(out, "style.css"), css.css);
fs.writeFileSync(path.join(out, "index.html"), `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="style.css"><body style="background:var(--app)"><div id="root" class="@container"></div><script src="out.js"></script>`);
