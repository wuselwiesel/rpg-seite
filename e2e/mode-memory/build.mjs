import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const out = path.join(here, ".build");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(
  path.join(out, "shim-nav.ts"),
  `import { useSyncExternalStore } from "react";
const subs = new Set<() => void>();
(window as any).__path = new URLSearchParams(location.search).get("pfad") || "/";
(window as any).__setPath = (p: string) => { (window as any).__path = p; subs.forEach((f) => f()); };
export const usePathname = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => (window as any).__path, () => "/");`,
);
await build({
  entryPoints: [path.join(here, "harness.tsx")],
  bundle: true,
  outfile: path.join(out, "out.js"),
  format: "iife",
  jsx: "automatic",
  alias: { "@": path.join(root, "src"), "next/navigation": path.join(out, "shim-nav.ts") },
  nodePaths: [path.join(root, "node_modules")],
  banner: { js: "var process = { env: {} };" },
  logLevel: "error",
});
fs.writeFileSync(path.join(out, "index.html"), `<!doctype html><div id="root"></div><script src="out.js"></script>`);
