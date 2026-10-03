// Wiki-Seitenleiste im echten Browser: Ordner und Seiten per Maus und per Touch (langes Drücken) verschieben.
// Aufruf: npm run test:e2e   (Chromium aus PLAYWRIGHT_CHROMIUM oder der von Playwright installierte)
import { chromium } from "playwright-core";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./build.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const url = "file://" + path.join(here, ".build", "index.html");
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined, args: ["--no-sandbox"] });
const ID = (n) => `00000000-0000-4000-8000-0000000000${n}`;
const results = [];
const check = (name, ok, extra = "") => {
  results.push(ok);
  console.log(ok ? "OK  " : "FAIL", name, extra);
};

async function fresh(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url);
  await page.getByRole("button", { name: "Alle aufklappen" }).click();
  const moves = () => page.evaluate(() => window.__moves);
  const row = (text) => page.locator('[role="treeitem"] > div', { hasText: text }).first();
  return { ctx, page, errors, moves, row };
}

async function mouseDrag(page, from, to) {
  const a = await from.boundingBox();
  const b = await to.boundingBox();
  await page.mouse.move(a.x + 40, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + 50, a.y + a.height / 2 + 4, { steps: 3 });
  await page.mouse.move(b.x + 40, b.y + b.height / 2, { steps: 12 });
  await page.waitForTimeout(80);
  await page.mouse.up();
  await page.waitForTimeout(150);
}

// 1. Seite in einen Ordner
{
  const { ctx, moves, row, page, errors } = await fresh();
  await mouseDrag(page, row("Lose Seite"), row("NPCs"));
  const m = await moves();
  check("Seite auf Ordner: wird Seite des Ordners", m.length === 1 && m[0].type === "page" && m[0].id === ID("a4") && m[0].folderId === ID("f4") && m[0].parentPageId === null, JSON.stringify(m));
  check("keine Seitenfehler", errors.length === 0, errors.join("|"));
  await ctx.close();
}
// 2. Ordner in einen Ordner
{
  const { ctx, moves, row, page } = await fresh();
  await mouseDrag(page, row("Städte"), row("NPCs"));
  const m = await moves();
  check("Ordner auf Ordner: wird Unterordner", m.length === 1 && m[0].type === "folder" && m[0].id === ID("f2") && m[0].parentId === ID("f4"), JSON.stringify(m));
  await ctx.close();
}
// 3. Seite auf Seite = Unterseite
{
  const { ctx, moves, row, page } = await fresh();
  await mouseDrag(page, row("Lose Seite"), row("Nebelhafen"));
  const m = await moves();
  check("Seite auf Seite: wird Unterseite im Ordner der Oberseite", m.length === 1 && m[0].parentPageId === ID("a1") && m[0].folderId === ID("f2"), JSON.stringify(m));
  await ctx.close();
}
// 4. Unzulässig: Ordner in eigenen Unterordner
{
  const { ctx, moves, row, page } = await fresh();
  await mouseDrag(page, row("Orte"), row("Städte"));
  check("Ordner in eigenen Unterordner wird abgelehnt", (await moves()).length === 0);
  await ctx.close();
}
// 5. Auf die oberste Ebene
{
  const { ctx, moves, row, page } = await fresh();
  const a = await row("Elfen").boundingBox();
  await page.mouse.move(a.x + 40, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + 50, a.y + a.height / 2 + 5, { steps: 3 });
  const zone = page.getByText("Hierher ziehen: ohne Ordner");
  check("Ablagefläche erscheint beim Ziehen", await zone.isVisible());
  const z = await zone.boundingBox();
  await page.mouse.move(z.x + z.width / 2, z.y + z.height / 2, { steps: 12 });
  await page.waitForTimeout(80);
  await page.mouse.up();
  await page.waitForTimeout(150);
  const m = await moves();
  check("Seite auf Ablagefläche: ohne Ordner", m.length === 1 && m[0].folderId === null && m[0].parentPageId === null, JSON.stringify(m));
  await ctx.close();
}
// 6. Kurzer Klick zieht nichts
{
  const { ctx, moves, row } = await fresh();
  await row("Elfen").click();
  check("Klick ohne Ziehen verschiebt nichts", (await moves()).length === 0);
  await ctx.close();
}
// 7. Touch: langes Drücken
{
  const { ctx, moves, row, page } = await fresh({ hasTouch: true });
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y, id: 0 }] });
  const a = await row("Lose Seite").boundingBox();
  const b = await row("NPCs").boundingBox();
  const ax = a.x + 40, ay = a.y + a.height / 2;
  await touch("touchStart", ax, ay);
  await page.waitForTimeout(450); // länger als die 300 ms Verzögerung
  for (let i = 1; i <= 12; i++) await touch("touchMove", ax + ((b.x + 40 - ax) * i) / 12, ay + ((b.y + b.height / 2 - ay) * i) / 12);
  await page.waitForTimeout(80);
  await touch("touchEnd");
  await page.waitForTimeout(200);
  const m = await moves();
  check("Touch: langes Drücken und Ziehen verschiebt", m.length === 1 && m[0].id === ID("a4") && m[0].folderId === ID("f4"), JSON.stringify(m));
  await ctx.close();
}
// 8. Touch: kurzes Wischen ohne langes Drücken verschiebt nichts (Liste soll scrollen können)
{
  const { ctx, moves, row, page } = await fresh({ hasTouch: true });
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y, id: 0 }] });
  const a = await row("Lose Seite").boundingBox();
  const b = await row("NPCs").boundingBox();
  const ax = a.x + 40, ay = a.y + a.height / 2;
  await touch("touchStart", ax, ay);
  for (let i = 1; i <= 8; i++) await touch("touchMove", ax, ay + ((b.y - ay) * i) / 8);
  await touch("touchEnd");
  await page.waitForTimeout(200);
  check("Touch: schnelles Wischen verschiebt nichts", (await moves()).length === 0);
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(failed ? `${failed} FEHLGESCHLAGEN` : "ALLE BESTANDEN");
process.exit(failed ? 1 : 0);
