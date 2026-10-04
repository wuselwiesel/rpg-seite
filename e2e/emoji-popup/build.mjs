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
fs.writeFileSync(path.join(out, "shim-dynamic.tsx"), `export default function dynamic() { return function Lazy() { return <div style={{ height: 360 }}>Katalog</div>; }; }`);
fs.writeFileSync(path.join(out, "stub-null.tsx"), `export function EmojiUploadForm() { return <div>Upload</div>; }`);
const stubs = { name: "stubs", setup(b) { b.onResolve({ filter: /emoji-upload-form$/ }, () => ({ path: path.join(out, "stub-null.tsx") })); } };
await build({
  entryPoints: [path.join(here, "harness.tsx")], bundle: true, outfile: path.join(out, "out.js"), format: "iife", jsx: "automatic",
  alias: { "@": path.join(root, "src"), "next/navigation": path.join(out, "shim-nav.ts"), "next/link": path.join(out, "shim-link.tsx"), "next/dynamic": path.join(out, "shim-dynamic.tsx") },
  nodePaths: [path.join(root, "node_modules")], plugins: [stubs], banner: { js: "var process = { env: {} };" }, logLevel: "error",
});
const cssFile = path.join(root, "src", "app", "globals.css");
const css = await postcss([tailwind()]).process(fs.readFileSync(cssFile, "utf8"), { from: cssFile });
fs.writeFileSync(path.join(out, "style.css"), css.css);
fs.writeFileSync(path.join(out, "index.html"), `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="style.css"><body style="background:var(--app);margin:0"><div id="root"></div><script src="out.js"></script>`);
