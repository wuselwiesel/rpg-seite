import { chromium } from "playwright-core";
const out = "/tmp/claude-0/guide";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const url = (s) => `file:///home/user/rpg-seite/e2e/anleitung/.build/index.html?screen=${s}`;
async function open(s, w, h = 900) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  p.on("pageerror", (e) => console.log(s, "ERR", e.message));
  await p.goto(url(s)); await p.waitForTimeout(900);
  return p;
}
const shot = (p, name) => p.locator("#shot").screenshot({ path: `${out}/${name}.png` });
let p = await open("tickets", 452); await shot(p, "tickets"); await p.close();
p = await open("ticket", 672); await shot(p, "ticket"); await p.close();
p = await open("besetzung", 792); await shot(p, "besetzung"); await p.close();
p = await open("editor", 792);
await shot(p, "editor0");
// „Schattenbibliothek“ markieren: schwebende Leiste mit [[ ]]
const ed = p.locator(".ProseMirror").first();
await p.evaluate(() => {
  const el = document.querySelector(".ProseMirror p");
  const t = [...el.childNodes].find((n) => n.nodeType === 3);
  const idx = t.textContent.indexOf("Gutshaus Blackwood");
  const r = document.createRange(); r.setStart(t, idx); r.setEnd(t, idx + "Gutshaus Blackwood".length);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  document.dispatchEvent(new Event("selectionchange"));
});
await ed.focus().catch(() => {});
await p.evaluate(() => {
  const el = document.querySelector(".ProseMirror p");
  const t = [...el.childNodes].find((n) => n.nodeType === 3);
  const idx = t.textContent.indexOf("Gutshaus Blackwood");
  const r = document.createRange(); r.setStart(t, idx); r.setEnd(t, idx + "Gutshaus Blackwood".length);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
});
await p.waitForTimeout(500);
await p.screenshot({ path: `${out}/editor1.png`, clip: { x: 0, y: 0, width: 792, height: 420 } });
const btn = p.getByRole("button", { name: /\[\[ \]\]|\[\[\]\]|Wiki/ });
console.log("knoepfe", await btn.count());
await b.close();
