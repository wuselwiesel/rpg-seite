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
fs.writeFileSync(path.join(out, "shim-nav.ts"), `export const useRouter = () => ({ refresh() {} }); export const usePathname = () => "/";`);
fs.writeFileSync(path.join(out, "shim-link.tsx"), `export default function Link({ children, ...r }: any) { return <a {...r}>{children}</a>; }`);
fs.writeFileSync(path.join(out, "shim-dynamic.tsx"), `export default function dynamic() { return function Lazy() { return <div>Katalog</div>; }; }`);
fs.writeFileSync(
  path.join(out, "stub-actions.ts"),
  `const w = window as any;
export async function createBadgeDef(_prev: any, fd: FormData) { w.__created.push(Object.fromEntries([...fd.entries()])); return null; }
export async function awardAccountBadge(def: string, user: string) { w.__awarded.push([def, user]); return w.__fail ? "Du kannst nur an Freund:innen verleihen." : null; }
const f = async () => null;
export const awardBadge = f, deleteBadgeDef = f, revokeBadge = f, setBadgeHidden = f, setFeaturedBadge = f;`,
);
fs.writeFileSync(path.join(out, "stub-supabase.ts"), `export const createClient = () => ({});`);
fs.writeFileSync(path.join(out, "stub-emoji-actions.ts"), `export async function createCustomEmoji() { return null; }`);
const stubs = {
  name: "stubs",
  setup(b) {
    b.onResolve({ filter: /^\.\/actions$/ }, (a) => (a.importer.includes("badge-controls") ? { path: path.join(out, "stub-actions.ts") } : undefined));
    b.onResolve({ filter: /supabase\/client$/ }, () => ({ path: path.join(out, "stub-supabase.ts") }));
    b.onResolve({ filter: /profile\/emojis\/actions$/ }, () => ({ path: path.join(out, "stub-emoji-actions.ts") }));
  },
};
await build({
  entryPoints: [path.join(here, "harness.tsx")], bundle: true, outfile: path.join(out, "out.js"), format: "iife", jsx: "automatic",
  alias: { "@": path.join(root, "src"), "next/navigation": path.join(out, "shim-nav.ts"), "next/link": path.join(out, "shim-link.tsx"), "next/dynamic": path.join(out, "shim-dynamic.tsx") },
  nodePaths: [path.join(root, "node_modules")], plugins: [stubs], banner: { js: "var process = { env: {} };" }, logLevel: "error",
});
const cssFile = path.join(root, "src", "app", "globals.css");
const css = await postcss([tailwind()]).process(fs.readFileSync(cssFile, "utf8"), { from: cssFile });
fs.writeFileSync(path.join(out, "style.css"), css.css);
fs.writeFileSync(path.join(out, "index.html"), `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="style.css"><body style="background:var(--app);margin:0"><script>window.__created=[];window.__awarded=[]</script><div id="root"></div><script src="out.js"></script>`);
