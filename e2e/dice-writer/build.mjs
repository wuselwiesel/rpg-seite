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
fs.writeFileSync(path.join(out, "shim-link.tsx"), `import React from "react"; export default function Link({href, children, ...rest}: any){ return <a href={href} onClick={(e)=>e.preventDefault()} {...rest}>{children}</a>; }`);
fs.writeFileSync(path.join(out, "shim-nav.ts"), `export const usePathname = () => "/"; export const useRouter = () => ({ push() {}, refresh() {}, replace() {} });`);
fs.writeFileSync(path.join(out, "shim-dynamic.tsx"), `import React from "react"; export default function dynamic(){ return function Lazy(){ return <div>Emoji-Katalog</div>; }; }`);
// Würfel-Aktionen: der Aufruf mit allen Formularfeldern wird gemerkt
fs.writeFileSync(
  path.join(out, "stub-dice-actions.ts"),
  `export type DiceRollState = { error: string | null; luckRemaining: number | null; success?: boolean | null };
export async function createDiceRoll(_post: string, _world: string, _prev: unknown, fd: FormData): Promise<DiceRollState> { (window as any).__rolls.push(Object.fromEntries(fd.entries())); return { error: null, luckRemaining: null }; }
export async function getLuckPointsRemaining() { return 3; }
export async function rerollWithLuck() { return { error: null, luckRemaining: 2 } as DiceRollState; }`,
);
// Supabase-Client: ChaBo-Bögen je Charakter aus window.__sheets, alles andere leer
fs.writeFileSync(
  path.join(out, "stub-client.ts"),
  `function q(table: string) {
  const f: Record<string, unknown> = {};
  const self: any = new Proxy(function () {}, {
    get(_t, k) {
      if (k === "then") return (res: any) => res({ data: [], count: 0, error: null });
      if (k === "eq") return (col: string, val: unknown) => { f[col] = val; return self; };
      if (k === "maybeSingle") return async () => ({ data: table === "character_sheets" ? ((window as any).__sheets[f.character_id as string] ? { data: (window as any).__sheets[f.character_id as string] } : null) : table === "worlds" ? { talent_config: null } : null, error: null });
      if (k === "presenceState") return () => ({});
      return () => self;
    },
    apply() { return self; },
  });
  return self;
}
export const createClient = () => ({ from: (t: string) => q(t), channel: () => q("channel"), removeChannel() {}, rpc: async () => ({ data: null, error: null }), auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) } });`,
);
const stubs = {
  name: "stubs",
  setup(b) {
    b.onResolve({ filter: /\.\.\/actions$/ }, (a) => (a.importer.endsWith("dice-roll-form.tsx") ? { path: path.join(out, "stub-dice-actions.ts") } : undefined));
    b.onResolve({ filter: /supabase\/client$/ }, () => ({ path: path.join(out, "stub-client.ts") }));
  },
};
await build({
  entryPoints: [path.join(here, "harness.tsx")], bundle: true, outfile: path.join(out, "out.js"), format: "iife", jsx: "automatic",
  alias: { "@": path.join(root, "src"), "next/link": path.join(out, "shim-link.tsx"), "next/navigation": path.join(out, "shim-nav.ts"), "next/dynamic": path.join(out, "shim-dynamic.tsx") },
  nodePaths: [path.join(root, "node_modules")], plugins: [stubs, genericStubs(root)], banner: { js: "var process = { env: {} };" }, logLevel: "error",
});
const cssFile = path.join(root, "src", "app", "globals.css");
const css = await postcss([tailwind()]).process(fs.readFileSync(cssFile, "utf8"), { from: cssFile });
fs.writeFileSync(path.join(out, "style.css"), css.css);
const sheetA = { attrBasis: { MU: "15" }, attrBonus: {} };
const sheetB = { attrBasis: { MU: "8" }, attrBonus: { MU: "2" } };
fs.writeFileSync(
  path.join(out, "index.html"),
  `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="style.css"><body style="background:var(--app);margin:0"><script>window.__rolls=[];window.__sheets={a:${JSON.stringify(sheetA)},b:${JSON.stringify(sheetB)}}</script><div id="root"></div><script src="out.js"></script>`,
);
