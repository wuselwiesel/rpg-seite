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
fs.writeFileSync(path.join(out, "shim-nav.ts"), `export const useRouter = () => ({ refresh() {}, push() {} });`);
fs.writeFileSync(
  path.join(out, "stub-actions.ts"),
  `import { parseEntries } from "@/lib/random-lists";
export async function addRandomEntries(kind: string, raw: string) { (window as any).__added.push([kind, raw]); const n = parseEntries(raw).length; return (window as any).__fail ? { error: "Pro Liste sind höchstens 500 Einträge möglich." } : { added: n, skipped: 0 }; }
export async function deleteRandomEntry(id: string) { (window as any).__deleted.push(id); return null; }`,
);
const stubs = { name: "stubs", setup(b) { b.onResolve({ filter: /^\.\/actions$/ }, (a) => (a.importer.includes("random-list-manager") ? { path: path.join(out, "stub-actions.ts") } : undefined)); } };
await build({
  entryPoints: [path.join(here, "harness.tsx")], bundle: true, outfile: path.join(out, "out.js"), format: "iife", jsx: "automatic",
  alias: { "@": path.join(root, "src"), "next/navigation": path.join(out, "shim-nav.ts") },
  nodePaths: [path.join(root, "node_modules")], plugins: [stubs], banner: { js: "var process = { env: {} };" }, logLevel: "error",
});
const cssFile = path.join(root, "src", "app", "globals.css");
const css = await postcss([tailwind()]).process(fs.readFileSync(cssFile, "utf8"), { from: cssFile });
fs.writeFileSync(path.join(out, "style.css"), css.css);
fs.writeFileSync(path.join(out, "index.html"), `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="style.css"><body style="background:var(--app);margin:0"><script>window.__added=[];window.__deleted=[]</script><div id="root"></div><script src="out.js"></script>`);
