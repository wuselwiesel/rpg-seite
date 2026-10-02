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

await build({
  entryPoints: [path.join(here, "harness.tsx")],
  bundle: true,
  outfile: path.join(out, "out.js"),
  format: "iife",
  jsx: "automatic",
  alias: { "@": path.join(root, "src"), "next/link": path.join(out, "shim-link.tsx") },
  nodePaths: [path.join(root, "node_modules")],
  banner: { js: "var process = { env: {} };" },
  loader: { ".svg": "dataurl", ".png": "dataurl" },
  logLevel: "error",
});
// Echtes Stylesheet der App (Tailwind), damit Darstellung und Überlagerungen wie in der App sind.
const cssFile = path.join(root, "src", "app", "globals.css");
const css = await postcss([tailwind()]).process(fs.readFileSync(cssFile, "utf8"), { from: cssFile });
fs.writeFileSync(path.join(out, "style.css"), css.css);
fs.writeFileSync(path.join(out, "index.html"), `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="style.css"><body style="background:var(--app)"><div id="root" class="@container"></div><script src="out.js"></script>`);
