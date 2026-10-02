// Beziehungsnetz im echten Browser (Handy-Emulation): Zoom, Verschieben, Pinch, Fokus, Zeitleiste, Hausfilter.
// Aufruf: npm run test:e2e   (nutzt Chromium aus PLAYWRIGHT_CHROMIUM oder dem von Playwright installierten)
import { chromium } from "playwright-core";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./build.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto("file://" + path.join(here, ".build", "index.html"));
await page.waitForSelector("svg");

const results = [];
const check = (name, ok, extra = "") => { results.push({ name, ok }); console.log(ok ? "OK  " : "FAIL", name, extra); };
const transform = () => page.evaluate(() => document.querySelector("svg g[transform]")?.getAttribute("transform"));
const parse = (t) => { const m = /translate\(([-\d.e]+) ([-\d.e]+)\) scale\(([-\d.e]+)\)/.exec(t || ""); return m ? { x: +m[1], y: +m[2], k: +m[3] } : null; };
const nodeCount = () => page.evaluate(() => document.querySelectorAll("svg g.cursor-pointer").length);
const edgeCount = () => page.evaluate(() => document.querySelectorAll("svg g[transform] path").length);

check("Graph rendert ohne Fehler", (await nodeCount()) > 1, `Knoten=${await nodeCount()}`);
const start = parse(await transform());
check("Start-Transform ist Identität", start && start.k === 1 && start.x === 0 && start.y === 0);

// Zoom per Knopf
await page.click('button[aria-label="Hineinzoomen"]');
let t = parse(await transform());
check("Knopf + zoomt hinein", t.k > 1, `k=${t.k.toFixed(2)}`);
await page.click('button[aria-label="Ansicht zurücksetzen"]');
t = parse(await transform());
check("Reset setzt zurück", t.k === 1 && t.x === 0 && t.y === 0);

// Drag per Touch (CDP)
const cdp = await ctx.newCDPSession(page);
const box = await page.locator("svg").boundingBox();
const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
const touch = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map((p, i) => ({ x: p.x, y: p.y, id: i })) });
await touch("touchStart", [{ x: cx, y: cy }]);
for (let i = 1; i <= 8; i++) await touch("touchMove", [{ x: cx + i * 10, y: cy + i * 6 }]);
await touch("touchEnd", []);
t = parse(await transform());
check("Ziehen mit einem Finger verschiebt", t.x > 10 && t.y > 5, `x=${t.x.toFixed(1)} y=${t.y.toFixed(1)}`);

// Pinch (zwei Finger auseinander)
await page.click('button[aria-label="Ansicht zurücksetzen"]');
await touch("touchStart", [{ x: cx - 20, y: cy }, { x: cx + 20, y: cy }]);
for (let i = 1; i <= 10; i++) await touch("touchMove", [{ x: cx - 20 - i * 8, y: cy }, { x: cx + 20 + i * 8, y: cy }]);
await touch("touchEnd", []);
t = parse(await transform());
check("Pinch (auseinander) zoomt hinein", t.k > 1.3, `k=${t.k.toFixed(2)}`);

// Mausrad
await page.click('button[aria-label="Ansicht zurücksetzen"]');
await page.mouse.move(cx, cy);
await page.mouse.wheel(0, -300);
t = parse(await transform());
check("Mausrad zoomt", t && t.k > 1, `k=${t?.k?.toFixed(2)}`);
await page.click('button[aria-label="Ansicht zurücksetzen"]');

// Fokus-Modus und ganze Welt
const focusNodes = await nodeCount();
await page.getByRole("button", { name: "Ganze Welt" }).click();
const allNodes = await nodeCount();
check("Ganze Welt zeigt mehr Figuren als der Fokus", allNodes > focusNodes, `Fokus=${focusNodes} Welt=${allNodes}`);

// Zeitleiste
const slider = page.locator('input[type="range"]');
const hasSlider = (await slider.count()) > 0;
check("Zeitregler vorhanden", hasSlider);
if (hasSlider) {
  const edgesNow = await edgeCount();
  await slider.fill("0");
  const edgesThen = await edgeCount();
  check("Zurückspulen zeigt weniger Beziehungen", edgesThen < edgesNow, `heute=${edgesNow} früh=${edgesThen}`);
  await slider.fill("500");
  const edgesMid = await edgeCount();
  check("Zwischenstand liegt dazwischen", edgesMid >= edgesThen && edgesMid <= edgesNow, `mitte=${edgesMid}`);
  await page.getByRole("button", { name: "Heute" }).click();
  check("„Heute“ stellt den vollen Stand wieder her", (await edgeCount()) === edgesNow);
}

// Hausfilter
await page.getByRole("button", { name: /^Haus A/ }).click();
const houseNodes = await nodeCount();
check("Hausfilter reduziert die Figuren", houseNodes < allNodes, `Haus A=${houseNodes}`);

check("keine Konsolen-/Seitenfehler", errors.length === 0, errors.join(" | ").slice(0, 300));
await page.screenshot({ path: path.join(here, ".build", "graph-mobile.png") });
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `${failed} FEHLGESCHLAGEN` : "ALLE BESTANDEN");
process.exit(failed ? 1 : 0);
