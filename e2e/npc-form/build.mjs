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
fs.writeFileSync(path.join(out, "shim-nav.ts"), `export const usePathname = () => "/characters/new"; export const useRouter = () => ({ push() {}, refresh() {}, replace() {} }); export const useSearchParams = () => new URLSearchParams(location.search);`);
fs.writeFileSync(path.join(out, "stub-actions.ts"), `export async function createCharacter(_prev: string | null, fd: FormData) { (window as any).__created.push(Object.fromEntries(fd.entries())); return null; }`);
fs.writeFileSync(path.join(out, "stub-upload.tsx"), `export function AvatarUpload() { return null; }`);
const stubs = {
  name: "stubs",
  setup(b) {
    b.onResolve({ filter: /^\.\.\/actions$/ }, (a) => (a.importer.includes(path.join("characters", "new")) ? { path: path.join(out, "stub-actions.ts") } : undefined));
    b.onResolve({ filter: /avatar-upload$/ }, () => ({ path: path.join(out, "stub-upload.tsx") }));
  },
};
await build({
  entryPoints: [path.join(here, "harness.tsx")],
  bundle: true,
  outfile: path.join(out, "out.js"),
  format: "iife",
  jsx: "automatic",
  alias: { "@": path.join(root, "src"), "next/navigation": path.join(out, "shim-nav.ts") },
  nodePaths: [path.join(root, "node_modules")],
  plugins: [stubs],
  banner: { js: "var process = { env: {} };" },
  logLevel: "error",
});
const cssFile = path.join(root, "src", "app", "globals.css");
const css = await postcss([tailwind()]).process(fs.readFileSync(cssFile, "utf8"), { from: cssFile });
fs.writeFileSync(path.join(out, "style.css"), css.css);
fs.writeFileSync(path.join(out, "index.html"), `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="style.css"><body style="background:var(--app)"><div id="root"></div><script src="out.js"></script>`);
