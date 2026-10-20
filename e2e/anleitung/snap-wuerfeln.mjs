import { chromium } from "playwright-core";
const out = "/tmp/claude-0/guide";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const url = (s, q = "") => `file:///home/user/rpg-seite/e2e/anleitung/.build/index.html?screen=${s}${q}`;
async function open(s, w, q = "", h = 900) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  p.on("pageerror", (e) => console.log(s, "ERR", e.message));
  await p.goto(url(s, q)); await p.waitForTimeout(900);
  await p.addStyleTag({ content: "#shot{padding-left:44px !important}" });
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
const dice = (p) => p.getByRole("button", { name: "Würfeln", exact: true }).first();
const form = (p) => p.locator("form").filter({ has: p.getByText("Worauf würfelst du?") });
const lab = (p, t) => form(p).locator("label", { hasText: t });

// Schreiben: Reiter und Bündeln
let p = await open("schreiben", 592);
const bun = p.getByRole("button", { name: /Bündeln/ });
await mark(p, [
  { n: 1, loc: p.getByRole("button", { name: "Schreiben", exact: true }).first() },
  { n: 2, loc: p.getByText("Du schreibst als"), dx: 255, dy: -2 },
  { n: 3, loc: bun },
  { n: 4, loc: p.locator("[contenteditable], textarea").first() },
  { n: 5, loc: p.getByRole("button", { name: /Weiterschreiben/ }) },
  { n: 10, loc: p.getByText("Danach dran:"), dx: -26, dy: 6 },
  { n: 6, loc: p.getByRole("button", { name: "ChaBo öffnen" }), dx: -8, dy: -20 },
  { n: 7, loc: p.getByRole("button", { name: "Als Erzähler:in schreiben" }), dx: -8, dy: -20 },
  { n: 8, loc: p.getByRole("button", { name: /Neues Kapitel/ }), dx: -8, dy: -20 },
  { n: 9, loc: p.getByRole("button", { name: "Formatierung anzeigen" }), dx: -8, dy: -20 },
]);
await shot(p, "schreiben0");
await p.close();

p = await open("schreiben", 592);
await bun.first().click().catch(async () => p.getByRole("button", { name: /Bündeln/ }).click());
await p.waitForTimeout(500);
await shot(p, "schreiben1");
await p.close();

// Würfeln, leer
p = await open("wuerfeln", 592);
await dice(p).click(); await p.waitForTimeout(500);
await shot(p, "w-roh");
await mark(p, [
  { n: 1, loc: lab(p, "Worauf würfelst du?") },
  { n: 2, loc: lab(p, "Wert übernehmen") },
  { n: 3, loc: lab(p, "Wert (optional)") },
  { n: 4, loc: lab(p, "Bonus") },
  { n: 5, loc: lab(p, "Würfel").last() },
  { n: 6, loc: lab(p, "Gegen wen?") },
  { n: 7, loc: form(p).getByRole("button", { name: "Würfeln" }) },
]);
await shot(p, "w0");
await p.close();

// Wert aus dem Bogen: Intuition + Bonus
p = await open("wuerfeln", 592);
await dice(p).click(); await p.waitForTimeout(500);
await lab(p, "Worauf würfelst du?").locator("input").fill("Pfad durch den Nebel finden");
await lab(p, "Wert übernehmen").locator("select").selectOption("Intuition");
await form(p).locator('input[name="bonus"]').fill("2");
await mark(p, [
  { n: 1, loc: lab(p, "Worauf würfelst du?") },
  { n: 2, loc: lab(p, "Wert übernehmen") },
  { n: 3, loc: lab(p, "Wert (optional)") },
  { n: 4, loc: lab(p, "Bonus") },
]);
await shot(p, "w1");
await p.close();

// Zustand
p = await open("wuerfeln", 592);
await dice(p).click(); await p.waitForTimeout(500);
await lab(p, "Worauf würfelst du?").locator("input").fill("Wein vertragen");
await lab(p, "Wert übernehmen").locator("select").selectOption("Konstitution");
await lab(p, "Zustand").locator("select").selectOption("betrunken");
await p.getByRole("radio", { name: /Stark/ }).first().click().catch(() => {});
await p.waitForTimeout(300);
await mark(p, [
  { n: 1, loc: lab(p, "Wert (optional)") },
  { n: 2, loc: lab(p, "Zustand") },
  { n: 3, loc: p.getByRole("radiogroup") },
]);
await shot(p, "w2");
await p.close();

// Frei würfeln, anderer Würfel
p = await open("wuerfeln", 592);
await dice(p).click(); await p.waitForTimeout(500);
await lab(p, "Worauf würfelst du?").locator("input").fill("Wer lacht da im Nebel?");
await form(p).locator('select[name="die"]').selectOption("6");
await mark(p, [
  { n: 1, loc: lab(p, "Worauf würfelst du?") },
  { n: 2, loc: lab(p, "Wert (optional)") },
  { n: 3, loc: lab(p, "Würfel").last() },
]);
await shot(p, "w3");
await p.close();

// Gegen wen
p = await open("wuerfeln", 592);
await dice(p).click(); await p.waitForTimeout(500);
await lab(p, "Worauf würfelst du?").locator("input").fill("Flüsterwort verstehen");
await lab(p, "Wert übernehmen").locator("select").selectOption("Intuition");
await lab(p, "Gegen wen?").locator("select").selectOption({ label: "Dorian Blackwood" });
await mark(p, [{ n: 1, loc: lab(p, "Gegen wen?") }]);
await shot(p, "w4");
await p.close();

// Glückspunkt
p = await open("wuerfeln", 592);
await dice(p).click(); await p.waitForTimeout(500);
await lab(p, "Worauf würfelst du?").locator("input").fill("Den Nebel beschwören");
await lab(p, "Wert übernehmen").locator("select").selectOption("Intuition");
await form(p).getByRole("button", { name: "Würfeln" }).click();
await p.waitForTimeout(700);
await mark(p, [
  { n: 1, loc: p.getByText("Glückspunkte in dieser Szene")  },
  { n: 2, loc: p.getByText("Glückspunkt nutzen?") },
  { n: 3, loc: p.getByRole("button", { name: "Ja, nochmal würfeln" }) },
]);
await shot(p, "w5");
await p.close();
await b.close();
