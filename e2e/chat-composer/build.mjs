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
fs.writeFileSync(path.join(out, "shim-nav.ts"), `export const usePathname = () => "/"; export const useRouter = () => ({ push() {}, refresh() {}, replace() {} });`);
fs.writeFileSync(path.join(out, "shim-dynamic.tsx"), `import React from "react"; export default function dynamic(){ return function Lazy(){ return <div>Emoji-Katalog</div>; }; }`);
fs.writeFileSync(path.join(out, "stub-supabase.ts"), `const chain: any = new Proxy(function () {}, { get(_t, k) { if (k === "then") return (res: any) => (typeof res === "function" ? res({ data: [], error: null }) : undefined); if (k === "presenceState") return () => ({}); return () => chain; }, apply() { return chain; } });\nexport const createClient = () => chain;`);
fs.writeFileSync(path.join(out, "stub-actions.ts"), `const f = async () => null; export const sendMessage = async (...a: any[]) => { (window as any).__sent.push(a); return null; }; export const addChatParticipant = f, deleteChat = f, deleteMessage = f, renameChat = f, setChatMuted = f, updateMessage = f, saveChatTheme = f, setPresenceMode = f, toggleReaction = f, getPostReactors = f, setBonusLikes = f, createCustomEmoji = f, deleteCustomEmoji = f;`);
fs.writeFileSync(path.join(out, "stub-null.tsx"), `export function AvatarUpload() { return null; }`);

const stubs = {
  name: "stubs",
  setup(b) {
    b.onResolve({ filter: /supabase\/client$/ }, () => ({ path: path.join(out, "stub-supabase.ts") }));
    b.onResolve({ filter: /(chats\/actions|\.\.\/actions|app\/[a-z-]+\/actions|app\/[a-z-]+-actions)$/ }, () => ({ path: path.join(out, "stub-actions.ts") }));
    b.onResolve({ filter: /(chat-theme-actions|profile\/actions|profile\/emojis\/actions)$/ }, () => ({ path: path.join(out, "stub-actions.ts") }));
    b.onResolve({ filter: /^@supabase\// }, () => ({ path: path.join(out, "stub-supabase.ts") }));
    b.onResolve({ filter: /avatar-upload$/ }, () => ({ path: path.join(out, "stub-null.tsx") }));
  },
};

const res = await build({
  entryPoints: [path.join(here, "harness.tsx")],
  bundle: true,
  outfile: path.join(out, "out.js"),
  format: "iife",
  jsx: "automatic",
  alias: { "@supabase/ssr": path.join(out, "stub-supabase.ts"), "@supabase/supabase-js": path.join(out, "stub-supabase.ts"), "@": path.join(root, "src"), "next/link": path.join(out, "shim-link.tsx"), "next/navigation": path.join(out, "shim-nav.ts"), "next/dynamic": path.join(out, "shim-dynamic.tsx") },
  nodePaths: [path.join(root, "node_modules")],
  plugins: [stubs],
  banner: { js: "var process = { env: {} };" },
  loader: { ".svg": "dataurl", ".png": "dataurl" },
  logLevel: "error", metafile: true,
});
const cssFile = path.join(root, "src", "app", "globals.css");
const css = await postcss([tailwind()]).process(fs.readFileSync(cssFile, "utf8"), { from: cssFile });
fs.writeFileSync(path.join(out, "style.css"), css.css);
fs.writeFileSync(path.join(out, "index.html"), `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="style.css"><body style="background:var(--app);margin:0"><script>window.__sent=[]</script><div id="root"></div><script src="out.js"></script>`);
