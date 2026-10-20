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
// Nummernmarken über Elemente setzen (Seitenkoordinaten)
async function mark(p, items) {
  for (const it of items) {
    const box = await it.loc.first().boundingBox();
    if (!box) { console.log("kein Element für Marke", it.n); continue; }
    await p.evaluate(({ n, x, y }) => {
      const d = document.createElement("div");
      d.textContent = String(n);
      d.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:22px;height:22px;border-radius:50%;background:#b4455c;color:#fff;font:700 13px/22px Inter,sans-serif;text-align:center;box-shadow:0 0 0 2px #fff;z-index:9999;pointer-events:none`;
      document.body.appendChild(d);
    }, { n: it.n, x: box.x + (it.dx ?? -10) , y: box.y + (it.dy ?? -10) + (await p.evaluate(() => window.scrollY)) });
  }
}
const shot = (p, name) => p.locator("#shot").screenshot({ path: `${out}/${name}.png` });
const sel = async (p, label, value) => p.locator("label", { hasText: label }).locator("select").selectOption(value);
const tab = (p, n) => p.getByRole("button", { name: n, exact: true }).first();

let p = await open("szene", 752); await shot(p, "szene"); await p.close();
p = await open("wurfzeilen", 752); await shot(p, "wurfzeilen"); await p.close();
p = await open("chabo", 1000); await shot(p, "chabo"); await p.close();
p = await open("netz", 900, ""); await shot(p, "netz"); await p.close();
p = await open("netz", 900, "&fokus=dorian"); await shot(p, "netz-fokus"); await p.close();
p = await open("karte", 920); await shot(p, "karte"); await p.close();

await b.close();
