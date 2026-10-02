import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const out = path.join(here, ".build");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "shim-link.tsx"), `import React from "react"; export default function Link({href, children, ...rest}: any){ return <a href={href} {...rest}>{children}</a>; }`);
fs.writeFileSync(path.join(out, "shim-nav.ts"), `export const usePathname = () => "/wiki"; export const useRouter = () => ({ push() {}, refresh() {}, replace() {} }); export const useSearchParams = () => new URLSearchParams();`);
fs.writeFileSync(path.join(out, "stub-actions.ts"), `export async function createWikiPage() { return null; }\nexport async function updateWikiPage() { return null; }`);
fs.writeFileSync(path.join(out, "stub-upload.tsx"), `export function AvatarUpload() { return null; }\nexport function GalleryUpload() { return null; }`);

fs.writeFileSync(path.join(out, "stub-emoji-actions.ts"), `export async function createCustomEmoji() { return null; }\nexport async function deleteCustomEmoji() { return null; }`);

const stubs = {
  name: "stubs",
  setup(b) {
    b.onResolve({ filter: /^\.\/actions$/ }, (a) => (a.importer.includes(path.join("src", "app", "wiki")) ? { path: path.join(out, "stub-actions.ts") } : undefined));
    b.onResolve({ filter: /profile\/emojis\/actions$/ }, () => ({ path: path.join(out, "stub-emoji-actions.ts") }));
    b.onResolve({ filter: /avatar-upload$|gallery-upload$/ }, () => ({ path: path.join(out, "stub-upload.tsx") }));
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
fs.writeFileSync(path.join(out, "index.html"), `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:sans-serif}</style><div id="root"></div><script src="out.js"></script>`);
