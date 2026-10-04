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
fs.writeFileSync(path.join(out, "shim-nav.ts"), `export const usePathname = () => "/"; export const useRouter = () => ({ push() {}, refresh() {}, replace() {} });`);
fs.writeFileSync(path.join(out, "stub-sheet-actions.ts"), `export async function saveCharacterSheet(id: string, data: unknown) { (window as any).__saves.push(data); return null; }`);
fs.writeFileSync(path.join(out, "stub-upload.tsx"), `export function AvatarUpload() { return null; }\nexport function GalleryUpload() { return null; }`);
fs.writeFileSync(path.join(out, "stub-emoji-actions.ts"), `export async function createCustomEmoji() { return null; }\nexport async function deleteCustomEmoji() { return null; }`);

const stubs = {
  name: "stubs",
  setup(b) {
    b.onResolve({ filter: /characters\/sheet-actions$/ }, () => ({ path: path.join(out, "stub-sheet-actions.ts") }));
    b.onResolve({ filter: /avatar-upload$/ }, () => ({ path: path.join(out, "stub-upload.tsx") }));
    b.onResolve({ filter: /profile\/emojis\/actions$/ }, () => ({ path: path.join(out, "stub-emoji-actions.ts") }));
  },
};

await build({
  entryPoints: [path.join(here, "harness.tsx")],
  bundle: true,
  outfile: path.join(out, "out.js"),
  format: "iife",
  jsx: "automatic",
  alias: { "@": path.join(root, "src"), "next/link": path.join(out, "shim-link.tsx"), "next/navigation": path.join(out, "shim-nav.ts") },
  nodePaths: [path.join(root, "node_modules")],
  plugins: [stubs],
  banner: { js: "var process = { env: {} };" },
  loader: { ".svg": "dataurl", ".png": "dataurl" },
  logLevel: "error",
});
const cssFile = path.join(root, "src", "app", "globals.css");
const css = await postcss([tailwind()]).process(fs.readFileSync(cssFile, "utf8"), { from: cssFile });
fs.writeFileSync(path.join(out, "style.css"), css.css);
fs.writeFileSync(path.join(out, "index.html"), `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="style.css"><body style="background:var(--app)"><div id="root"></div><script src="out.js"></script>`);
