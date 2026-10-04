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
fs.writeFileSync(path.join(out, "shim-link.tsx"), `export default function Link({ children, ...r }: any) { return <a {...r} onClick={(e) => e.preventDefault()}>{children}</a>; }`);
fs.writeFileSync(path.join(out, "shim-nav.ts"), `export const usePathname = () => "/"; export const useRouter = () => ({ push() {}, refresh() {}, replace() {} });`);
fs.writeFileSync(path.join(out, "shim-dynamic.tsx"), `export default function dynamic() { return function Lazy() { return <div>Katalog</div>; }; }`);
fs.writeFileSync(path.join(out, "stub-supabase.ts"), `const chain: any = new Proxy(function () {}, { get(_t, k) { if (k === "then") return (res: any) => (typeof res === "function" ? res({ data: [], error: null }) : undefined); if (k === "presenceState") return () => ({}); return () => chain; }, apply() { return chain; } });\nexport const createClient = () => chain;`);
fs.writeFileSync(
  path.join(out, "stub-bubble-actions.ts"),
  `export type BubbleChat = any; export type BubbleData = any;
const AVATAR = "data:image/svg+xml;utf8," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='64' height='64' fill='teal'/><circle cx='32' cy='26' r='12' fill='white'/></svg>");
export async function getBubbleChats() { return { chats: [{ kind: "rp", id: "chatA", title: "Finn", avatarUrl: AVATAR, lastText: "Hallo", lastAt: new Date().toISOString(), lastMine: false, unread: 2 }], activeCharacterId: "c1", characters: [] }; }
export async function getBubbleUnread() { return (window as any).__unread ? { rp: { chatA: 2 }, account: {} } : { rp: {}, account: {} }; }`,
);
fs.writeFileSync(path.join(out, "stub-any-actions.ts"), `const f: any = async () => null; export const sendMessage = f, deleteMessage = f, updateMessage = f, sendAccountMessage = f, editAccountMessage = f, updateAccountMessage = f, sendRpMessage = f, setChatMuted = f, setAccountChatMuted = f, deleteAccountMessage = f, markRead = f, createCustomEmoji = f, toggleReaction = f, getPostReactors = f, setBonusLikes = f;`);
const stubs = {
  name: "stubs",
  setup(b) {
    b.onResolve({ filter: /supabase\/client$/ }, () => ({ path: path.join(out, "stub-supabase.ts") }));
    b.onResolve({ filter: /^@supabase\// }, () => ({ path: path.join(out, "stub-supabase.ts") }));
    b.onResolve({ filter: /app\/bubble-actions$/ }, () => ({ path: path.join(out, "stub-bubble-actions.ts") }));
    b.onResolve({ filter: /(chats\/actions|redaktion\/chat\/actions|profile\/emojis\/actions|profile\/actions|chat-theme-actions|app\/[a-z-]+\/actions)$/ }, () => ({ path: path.join(out, "stub-any-actions.ts") }));
  },
};
await build({
  entryPoints: [path.join(here, "harness.tsx")], bundle: true, outfile: path.join(out, "out.js"), format: "iife", jsx: "automatic",
  alias: { "@": path.join(root, "src"), "next/link": path.join(out, "shim-link.tsx"), "next/navigation": path.join(out, "shim-nav.ts"), "next/dynamic": path.join(out, "shim-dynamic.tsx") },
  nodePaths: [path.join(root, "node_modules")], plugins: [stubs], banner: { js: "var process = { env: {} };" }, loader: { ".svg": "dataurl", ".png": "dataurl" }, logLevel: "error",
});
const cssFile = path.join(root, "src", "app", "globals.css");
const css = await postcss([tailwind()]).process(fs.readFileSync(cssFile, "utf8"), { from: cssFile });
fs.writeFileSync(path.join(out, "style.css"), css.css);
fs.writeFileSync(path.join(out, "index.html"), `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="style.css"><body style="background:var(--app);margin:0"><div id="root"></div><script src="out.js"></script>`);
