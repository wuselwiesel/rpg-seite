import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const out = path.join(here, ".build");
fs.mkdirSync(out, { recursive: true });

fs.writeFileSync(path.join(out, "shim-link.tsx"), `import React from "react"; export default function Link({href, children, ...rest}: any){ return <a href={href} onClick={(e)=>e.preventDefault()} {...rest}>{children}</a>; }`);
fs.writeFileSync(path.join(out, "shim-nav.ts"), `export const usePathname = () => "/wiki"; export const useRouter = () => ({ push() {}, refresh() {}, replace() {} });`);
fs.writeFileSync(
  path.join(out, "stub-actions.ts"),
  `const log = (e: unknown) => (window as any).__moves.push(e);
export async function moveWikiFolder(id: string, parentId: string | null) { log({ type: "folder", id, parentId }); return null; }
export async function moveWikiPage(id: string, folderId: string | null, parentPageId: string | null) { log({ type: "page", id, folderId, parentPageId }); return null; }
export async function createWikiFolder() { return null; }
export async function renameWikiFolder() { return null; }
export async function deleteWikiFolder() { return null; }`,
);

// Server-Aktionen des Wikis durch Platzhalter ersetzen.
const stubServerActions = {
  name: "stub-wiki-actions",
  setup(b) {
    b.onResolve({ filter: /^\.\/(folder-actions|actions)$/ }, (args) =>
      args.importer.includes(path.join("src", "app", "wiki")) ? { path: path.join(out, "stub-actions.ts") } : undefined,
    );
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
  plugins: [stubServerActions],
  banner: { js: "var process = { env: {} };" },
  loader: { ".svg": "dataurl", ".png": "dataurl" },
  logLevel: "error",
});
fs.writeFileSync(
  path.join(out, "index.html"),
  `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:sans-serif} ul{list-style:none;margin:0;padding-left:12px} .hidden{display:none} @media(min-width:1024px){.lg\\:flex{display:flex}.lg\\:hidden{display:none}}</style><div id="root" style="max-width:900px"></div><script src="out.js"></script>`,
);
