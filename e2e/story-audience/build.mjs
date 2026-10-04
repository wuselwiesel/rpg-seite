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
fs.writeFileSync(path.join(out, "shim-nav.ts"), `export const useRouter = () => ({ refresh() {}, push() {} }); export const usePathname = () => "/";`);
fs.writeFileSync(path.join(out, "shim-link.tsx"), `export default function Link({ children, ...r }: any) { return <a {...r}>{children}</a>; }`);
fs.writeFileSync(
  path.join(out, "stub-supabase.ts"),
  `const w = window as any;
export const createClient = () => ({
  from(table: string) {
    const q: any = {
      select() { return q; }, eq() { return q; }, order() { return q; },
      upsert(row: any, opts: any) { w.__upserts.push([table, row, opts]); return Promise.resolve({ error: null }); },
      then(res: any) { return Promise.resolve({ data: (w.__data[table] ?? []), error: null }).then(res); },
    };
    return q;
  },
});`,
);
fs.writeFileSync(path.join(out, "stub-actions.ts"), `const f = async () => null; export const deleteHighlight = f, deleteStory = f, replyToStory = f, toggleStoryLike = async () => ({ liked: true }), answerSticker = f, getStickerState = async () => ({}), voteSticker = f;`);
const stubs = {
  name: "stubs",
  setup(b) {
    b.onResolve({ filter: /supabase\/client$/ }, () => ({ path: path.join(out, "stub-supabase.ts") }));
    b.onResolve({ filter: /app\/stories\/actions$/ }, () => ({ path: path.join(out, "stub-actions.ts") }));
  },
};
await build({
  entryPoints: [path.join(here, "harness.tsx")], bundle: true, outfile: path.join(out, "out.js"), format: "iife", jsx: "automatic",
  alias: { "@": path.join(root, "src"), "next/navigation": path.join(out, "shim-nav.ts"), "next/link": path.join(out, "shim-link.tsx") },
  nodePaths: [path.join(root, "node_modules")], plugins: [stubs], banner: { js: "var process = { env: {} };" }, logLevel: "error",
});
const cssFile = path.join(root, "src", "app", "globals.css");
const css = await postcss([tailwind()]).process(fs.readFileSync(cssFile, "utf8"), { from: cssFile });
fs.writeFileSync(path.join(out, "style.css"), css.css);
fs.writeFileSync(
  path.join(out, "index.html"),
  `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="style.css"><body style="background:var(--app);margin:0"><script>window.__upserts=[];window.__data={story_views:[{character_id:"a",created_at:"2026-10-04T10:00:00Z",characters:{id:"a",name:"Finn Murphy",avatar_url:null}},{character_id:"b",created_at:"2026-10-04T09:00:00Z",characters:{id:"b",name:"Aoife Walsh",avatar_url:null}}],story_likes:[{character_id:"b",characters:{id:"b",name:"Aoife Walsh",avatar_url:null}},{character_id:"c",characters:{id:"c",name:"Rory Quinn",avatar_url:null}}]}</script><div id="root"></div><script src="out.js"></script>`,
);
