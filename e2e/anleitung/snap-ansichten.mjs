import { chromium } from "playwright-core";
const out = "/tmp/claude-0/guide";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const url = (s, q = "") => `file:///home/user/rpg-seite/e2e/anleitung/.build/index.html?screen=${s}${q}`;
async function open(s, w, q = "", h = 800) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  p.on("pageerror", (e) => console.log(s, "ERR", e.message));
  await p.goto(url(s, q)); await p.waitForTimeout(800);
  return p;
}
const shot = (p, name) => p.locator("#shot").screenshot({ path: `${out}/${name}.png` });

let p = await open("szene", 752); await shot(p, "szene"); await p.close();
p = await open("wurfzeilen", 752); await shot(p, "wurfzeilen"); await p.close();
p = await open("chabo", 1000); await shot(p, "chabo"); await p.close();
p = await open("netz", 900, ""); await shot(p, "netz"); await p.close();
p = await open("netz", 900, "&fokus=dorian"); await shot(p, "netz-fokus"); await p.close();
p = await open("karte", 920); await shot(p, "karte"); await p.close();

await b.close();
