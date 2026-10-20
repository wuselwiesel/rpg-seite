// Bilder für die Anleitung ohne Würfeln: Welt mit ausgeschaltetem Würfeln (Reiter, Attribute und Talente entfallen).
import { chromium } from "playwright-core";
const out = "/tmp/claude-0/guide";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const url = (s) => `file:///home/user/rpg-seite/e2e/anleitung/.build/index.html?nodice=1&screen=${s}`;
async function open(s, w, h = 900) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  p.on("pageerror", (e) => console.log(s, "ERR", e.message));
  await p.goto(url(s)); await p.waitForTimeout(900);
  return p;
}
async function mark(p, items) {
  for (const it of items) {
    const box = await it.loc.first().boundingBox();
    if (!box) { console.log("kein Element für Marke", it.n); continue; }
    const sy = await p.evaluate(() => window.scrollY);
    await p.evaluate(({ n, x, y }) => {
      const d = document.createElement("div");
      d.textContent = String(n);
      d.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:22px;height:22px;border-radius:50%;background:#b4455c;color:#fff;font:700 13px/22px Inter,sans-serif;text-align:center;box-shadow:0 0 0 2px #fff;z-index:9999;pointer-events:none`;
      document.body.appendChild(d);
    }, { n: it.n, x: box.x + (it.dx ?? -26), y: box.y + sy + (it.dy ?? 4) });
  }
}
const shot = (p, name) => p.locator("#shot").screenshot({ path: `${out}/${name}.png` });

let p = await open("szene", 752); await shot(p, "nd-szene"); await p.close();
p = await open("chabo", 1000); await shot(p, "nd-chabo"); await p.close();

p = await open("schreiben", 592);
await p.addStyleTag({ content: "#shot{padding-left:44px !important}" });
console.log(await p.evaluate(() => [...document.querySelectorAll("button")].map((x) => (x.getAttribute("title") || x.getAttribute("aria-label") || x.textContent).trim())));
await mark(p, [
  { n: 1, loc: p.getByRole("button", { name: "Schreiben", exact: true }).first(), dx: -8, dy: -10 },
  { n: 2, loc: p.getByText("Du schreibst als"), dx: 255, dy: -2 },
  { n: 3, loc: p.getByRole("button", { name: /Bündeln/ }) },
  { n: 4, loc: p.locator("[contenteditable], textarea").first() },
  { n: 5, loc: p.getByRole("button", { name: /Weiterschreiben/ }) },
  { n: 10, loc: p.getByText("Danach dran:"), dx: -26, dy: 6 },
  { n: 6, loc: p.getByRole("button", { name: /öffnen/ }), dx: -8, dy: -20 },
  { n: 7, loc: p.getByRole("button", { name: "Als Erzähler:in schreiben" }), dx: -8, dy: -20 },
  { n: 8, loc: p.getByRole("button", { name: /Neues Kapitel/ }), dx: -8, dy: -20 },
  { n: 9, loc: p.getByRole("button", { name: "Formatierung anzeigen" }), dx: -8, dy: -20 },
]);
await shot(p, "nd-schreiben0"); await p.close();

p = await open("schreiben", 592);
await p.addStyleTag({ content: "#shot{padding-left:44px !important}" });
await p.getByRole("button", { name: /Bündeln/ }).click(); await p.waitForTimeout(500);
await shot(p, "nd-schreiben1"); await p.close();
await b.close();
