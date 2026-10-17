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
fs.writeFileSync(path.join(out, "shim-nav.ts"), `export const useRouter = () => ({ refresh() {}, push() {} });`);
fs.writeFileSync(
  path.join(out, "stub-actions.ts"),
  `export async function createTicket(...a: unknown[]) { (window as any).__calls.push(["create", ...a]); return (window as any).__fail ? "Zu viele Meldungen." : null; }
export async function setTicketStatus(...a: unknown[]) { (window as any).__calls.push(["status", ...a]); return null; }`,
);
const stubs = { name: "stubs", setup(b) { b.onResolve({ filter: /\.\/actions$/ }, () => ({ path: path.join(out, "stub-actions.ts") })); } };
await build({
  entryPoints: [path.join(here, "harness.tsx")], bundle: true, outfile: path.join(out, "out.js"), format: "iife", jsx: "automatic",
  alias: { "@": path.join(root, "src"), "next/navigation": path.join(out, "shim-nav.ts") },
  nodePaths: [path.join(root, "node_modules")], plugins: [stubs, genericStubs(root)], banner: { js: "var process = { env: {} };" }, logLevel: "error",
});
const cssFile = path.join(root, "src", "app", "globals.css");
const css = await postcss([tailwind()]).process(fs.readFileSync(cssFile, "utf8"), { from: cssFile });
fs.writeFileSync(path.join(out, "style.css"), css.css);
fs.writeFileSync(path.join(out, "index.html"), `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="style.css"><body style="background:var(--app);margin:0"><script>window.__calls=[]</script><div id="root"></div><script src="out.js"></script>`);
