// Karten im echten Browser: Zoom, Verschieben, Pins ansehen, setzen, ziehen, bearbeiten, löschen, Pinch per Touch.
import { chromium } from "playwright-core";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./build.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const url = "file://" + path.join(here, ".build", "index.html");
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined, args: ["--no-sandbox"] });
const results = [];
const check = (name, ok, extra = "") => {
  results.push(ok);
  console.log(ok ? "OK  " : "FAIL", name, extra);
};

async function fresh(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 900 }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url);
  await page.locator('[data-testid="map-viewport"] img').waitFor();
  await page.waitForFunction(() => document.querySelector('[data-testid="map-viewport"] img').complete);
  await page.waitForTimeout(100);
  const viewport = page.locator('[data-testid="map-viewport"]');
  const calls = () => page.evaluate(() => window.__calls);
  const scale = async () =>
    page.evaluate(() => {
      const m = /scale\(([\d.]+)\)/.exec(document.querySelector('[data-testid="map-inner"]').style.transform);
      return m ? Number(m[1]) : 1;
    });
  const translate = () =>
    page.evaluate(() => {
      const m = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(document.querySelector('[data-testid="map-inner"]').style.transform);
      return m ? [Number(m[1]), Number(m[2])] : [0, 0];
    });
  return { ctx, page, errors, viewport, calls, scale, translate };
}

// 1. Anzeige
{
  const { ctx, page, viewport, errors } = await fresh();
  const box = await viewport.boundingBox();
  check("Seitenverhältnis folgt dem Bild (800:500)", Math.abs(box.width / box.height - 1.6) < 0.02, `${box.width}x${box.height}`);
  check("zwei Pins sichtbar", (await page.locator("[data-pin]").count()) === 2);
  check("keine Seitenfehler", errors.length === 0, errors.join("|"));
  await ctx.close();
}
// 2. Zoom per Mausrad, Pins behalten ihre Größe, Zurücksetzen
{
  const { ctx, page, viewport, scale } = await fresh();
  const box = await viewport.boundingBox();
  const pin = page.locator('[data-pin="p1"] > span:last-child');
  const before = await pin.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -600);
  await page.waitForTimeout(100);
  const s = await scale();
  check("Mausrad zoomt hinein", s > 1.5, String(s));
  const after = await pin.boundingBox();
  check("Pin behält seine Größe beim Zoomen", Math.abs(after.width - before.width) < 1.5, `${before.width} -> ${after.width}`);
  await page.getByRole("button", { name: "Ansicht zurücksetzen" }).click();
  check("Zurücksetzen", (await scale()) === 1);
  await page.getByRole("button", { name: "Vergrößern" }).click();
  check("Plus-Knopf zoomt", (await scale()) > 1.4);
  await ctx.close();
}
// 3. Verschieben per Ziehen (nur wenn hineingezoomt), bleibt im Bild
{
  const { ctx, page, viewport, translate } = await fresh();
  const box = await viewport.boundingBox();
  await page.getByRole("button", { name: "Vergrößern" }).click();
  await page.getByRole("button", { name: "Vergrößern" }).click();
  const [x0] = await translate();
  await page.mouse.move(box.x + 300, box.y + 200);
  await page.mouse.down();
  await page.mouse.move(box.x + 200, box.y + 160, { steps: 6 });
  await page.mouse.up();
  const [x1, y1] = await translate();
  check("Ziehen verschiebt die Karte", x1 < x0 || y1 < 0, `${x0} -> ${x1},${y1}`);
  await page.mouse.move(box.x + 100, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 900, box.y + 800, { steps: 6 });
  await page.mouse.up();
  const [x2, y2] = await translate();
  check("Karte lässt sich nicht aus dem Bild ziehen", x2 <= 0 && y2 <= 0, `${x2},${y2}`);
  await ctx.close();
}
// 4. Pin ansehen
{
  const { ctx, page } = await fresh();
  await page.locator('[data-pin="p1"]').click();
  check("Pin zeigt Name und Link zur Seite", (await page.getByRole("heading", { name: "Nebelhafen" }).count()) === 1 && (await page.getByRole("link", { name: /Zur Seite „Nebelhafen \(Seite\)“/ }).getAttribute("href")) === "/wiki/pg1");
  await page.locator('[data-pin="p2"]').click();
  check("Pin mit Zielkarte", (await page.getByRole("link", { name: /Zur Karte „Burgkarte“/ }).getAttribute("href")) === "/wiki/karten/m2");
  await ctx.close();
}
// 5. Pin setzen (Bearbeiten) – Koordinaten auch bei Zoom richtig
{
  const { ctx, page, viewport, calls } = await fresh();
  await page.getByRole("button", { name: "Pins bearbeiten" }).click();
  const box = await viewport.boundingBox();
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.getByLabel("Name", { exact: true }).first().fill("Neuer Ort");
  await page.getByLabel("Führt zur Wiki-Seite").selectOption("pg2");
  await page.getByRole("button", { name: "Speichern" }).click();
  await page.waitForTimeout(150);
  const c = (await calls()).find((x) => x.add);
  check("Pin wird bei 50/50 gespeichert", c && Math.abs(c.add.x - 50) < 1 && Math.abs(c.add.y - 50) < 1 && c.add.label === "Neuer Ort" && c.add.pageId === "pg2", JSON.stringify(c));
  check("neuer Pin erscheint", (await page.locator("[data-pin]").count()) === 3);
  // hineingezoomt klicken: Mitte bleibt bei 50 %, ein Punkt links oben der Mitte ist kleiner
  await page.getByRole("button", { name: "Vergrößern" }).click();
  await page.getByRole("button", { name: "Vergrößern" }).click();
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.getByLabel("Name", { exact: true }).first().fill("Mitte gezoomt");
  await page.getByRole("button", { name: "Speichern" }).click();
  await page.waitForTimeout(150);
  const c2 = (await calls()).filter((x) => x.add)[1];
  check("Koordinaten stimmen auch hineingezoomt", c2 && Math.abs(c2.add.x - 50) < 2 && Math.abs(c2.add.y - 50) < 2, JSON.stringify(c2));
  await ctx.close();
}
// 6. Pin ziehen
{
  const { ctx, page, viewport, calls } = await fresh();
  await page.getByRole("button", { name: "Pins bearbeiten" }).click();
  const box = await viewport.boundingBox();
  const pinBox = await page.locator('[data-pin="p1"] > span:last-child').boundingBox();
  await page.mouse.move(pinBox.x + pinBox.width / 2, pinBox.y + pinBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  const m = (await calls()).find((x) => x.move);
  check("Pin wird verschoben und gespeichert", m && m.move.id === "p1" && m.move.x > 50 && m.move.x < 70, JSON.stringify(m));
  check("Ziehen öffnet kein Formular", (await page.getByRole("form", { name: "Pin bearbeiten" }).count()) === 0);
  await ctx.close();
}
// 7. Pin bearbeiten und entfernen
{
  const { ctx, page, calls } = await fresh();
  await page.getByRole("button", { name: "Pins bearbeiten" }).click();
  await page.locator('[data-pin="p2"]').click();
  const name = page.getByLabel("Name", { exact: true }).first();
  check("Formular zeigt die Werte des Pins", (await name.inputValue()) === "Alte Burg" && (await page.getByLabel("Führt zur Karte").inputValue()) === "m2");
  await name.fill("Burg Rabenstein");
  await page.getByRole("button", { name: "Speichern" }).click();
  await page.waitForTimeout(150);
  check("Änderung wird gespeichert", (await calls()).some((x) => x.update && x.update.id === "p2" && x.update.label === "Burg Rabenstein"));
  await page.locator('[data-pin="p1"]').click();
  await page.getByRole("button", { name: "Pin entfernen" }).click();
  await page.waitForTimeout(150);
  check("Pin wird entfernt", (await calls()).some((x) => x.del === "p1") && (await page.locator('[data-pin="p1"]').count()) === 0);
  await ctx.close();
}
// 8. Pinch mit zwei Fingern (Touch)
{
  const { ctx, page, viewport, scale } = await fresh({ hasTouch: true, isMobile: true, viewport: { width: 420, height: 800 } });
  const box = await viewport.boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) });
  await touch("touchStart", [[cx - 30, cy], [cx + 30, cy]]);
  for (let i = 1; i <= 8; i++) await touch("touchMove", [[cx - 30 - i * 10, cy], [cx + 30 + i * 10, cy]]);
  await touch("touchEnd", []);
  await page.waitForTimeout(100);
  const s = await scale();
  check("Zwei Finger zoomen hinein", s > 1.8, String(s));
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(failed ? `${failed} Test(e) fehlgeschlagen` : `Alle ${results.length} Prüfungen bestanden`);
process.exit(failed ? 1 : 0);
