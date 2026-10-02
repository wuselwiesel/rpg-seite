import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const out = path.join(here, ".build");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "shim-link.tsx"), `import React from "react"; export default function Link({href, children, ...rest}: any){ return <a href={href} {...rest}>{children}</a>; }`);
await build({
  entryPoints: [path.join(here, "harness.tsx")], bundle: true, outfile: path.join(out, "out.js"), format: "iife", jsx: "automatic",
  alias: { "@": path.join(root, "src"), "next/link": path.join(out, "shim-link.tsx") },
  nodePaths: [path.join(root, "node_modules")], define: { "process.env.NODE_ENV": '"development"' }, logLevel: "error",
});
fs.writeFileSync(path.join(out, "index.html"), `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:sans-serif} svg{width:100%;height:auto;display:block} .touch-none{touch-action:none}</style><div id="root" style="max-width:480px"></div><script src="out.js"></script>`);

