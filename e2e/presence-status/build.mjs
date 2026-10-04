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
fs.writeFileSync(
  path.join(out, "stub-supabase.ts"),
  `const w = window as any;
export const createClient = () => ({
  channel() {
    const ch: any = {
      handlers: {} as Record<string, any>,
      on(type: string, filter: any, cb: any) { ch.handlers[type + ":" + filter.event] = cb; return ch; },
      subscribe(cb: any) { setTimeout(() => { cb("SUBSCRIBED"); w.__sync = () => ch.handlers["presence:sync"]?.(); w.__sync(); }, 0); return ch; },
      presenceState() { return w.__presence; },
      track(p: any) { w.__tracked.push(p); return Promise.resolve(); },
      untrack() { w.__tracked.push("untrack"); return Promise.resolve(); },
      send(m: any) { w.__sent.push(m); return Promise.resolve(); },
    };
    return ch;
  },
  removeChannel() {},
});`,
);
fs.writeFileSync(path.join(out, "stub-actions.ts"), `export async function setPresenceMode() { return null; }\nexport async function setPresenceStatus(e: string, t: string) { (window as any).__saved.push([e, t]); return null; }`);

const stubs = {
  name: "stubs",
  setup(b) {
    b.onResolve({ filter: /supabase\/client$/ }, () => ({ path: path.join(out, "stub-supabase.ts") }));
    b.onResolve({ filter: /app\/profile\/actions$/ }, () => ({ path: path.join(out, "stub-actions.ts") }));
  },
};
await build({
  entryPoints: [path.join(here, "harness.tsx")], bundle: true, outfile: path.join(out, "out.js"), format: "iife", jsx: "automatic",
  alias: { "@": path.join(root, "src") }, nodePaths: [path.join(root, "node_modules")], plugins: [stubs],
  banner: { js: "var process = { env: {} };" }, logLevel: "error",
});
const cssFile = path.join(root, "src", "app", "globals.css");
const css = await postcss([tailwind()]).process(fs.readFileSync(cssFile, "utf8"), { from: cssFile });
fs.writeFileSync(path.join(out, "style.css"), css.css);
fs.writeFileSync(
  path.join(out, "index.html"),
  `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="style.css"><body style="background:var(--app);margin:0"><script>window.__tracked=[];window.__sent=[];window.__saved=[];window.__presence={dot:[{at:1}],emoji:[{at:1,emoji:"🌙"}],emojitext:[{at:2,emoji:"✍️",text:"schreibt gerade"},{at:1}],me:[{at:1}]}</script><div id="root"></div><script src="out.js"></script>`,
);
