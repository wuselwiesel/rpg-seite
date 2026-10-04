// ChaBo im Bearbeiten: Attribute und Talente würfeln, Stil, Rückgängig, Rassen-Boni, Layout am Handy.
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

async function fresh(query = "?gefuellt=1", opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url + query);
  await page.getByRole("button", { name: "Bearbeiten" }).first().click();
  const attrs = () =>
    page.locator('section[aria-label="Attribute"] input[aria-invalid]').evaluateAll((els) => els.filter((e) => e.closest("label")?.textContent?.startsWith("Basis")).map((e) => e.value));
  const bonuses = () => page.locator('section[aria-label="Talente"] input[aria-label^="Bonus "]').evaluateAll((els) => els.map((e) => e.value));
  return { ctx, page, errors, attrs, bonuses };
}
const sum = (xs) => xs.reduce((s, x) => s + (Number(x) || 0), 0);

// 1. Attribute würfeln: Budget, Bereich, Glück
{
  const { ctx, page, errors, attrs } = await fresh();
  const before = await attrs();
  check("Ausgangswerte stehen drin", before.join() === "12,11,9,8,10,7,6,9,8,10", before.join());
  check("Rückgängig anfangs gesperrt", await page.getByRole("button", { name: "Attribute rückgängig" }).isDisabled());
  check("Stil „Ausgewogen“ ist vorgewählt", (await page.getByRole("radio", { name: "Ausgewogen" }).getAttribute("aria-checked")) === "true");
  let ok = true;
  const seenLuck = new Set();
  for (let i = 0; i < 25; i++) {
    await page.getByRole("button", { name: "Attribute würfeln" }).click();
    const v = (await attrs()).map(Number);
    const gl = v[9];
    seenLuck.add(gl);
    if (v.length !== 10 || sum(v) !== 90 || v.some((x) => x < 1 || x > 19) || ![1, 5, 10, 15].includes(gl)) ok = false;
  }
  check("25 Würfe: immer 90 Punkte, 1–19, Glück 1/5/10/15", ok, [...seenLuck].join());
  check("Zähler zeigt 90 / 90", (await page.locator('[aria-label="Attributpunkte"]').innerText()).includes("90 / 90"));
  check("keine ungültigen Felder", (await page.locator('section[aria-label="Attribute"] [aria-invalid="true"]').count()) === 0);
  check("keine Seitenfehler", errors.length === 0, errors.join("|"));
  await ctx.close();
}
// 2. Stil Wild und Speichern
{
  const { ctx, page, attrs } = await fresh();
  await page.getByRole("radio", { name: "Wild" }).click();
  check("Wild ist gewählt", (await page.getByRole("radio", { name: "Wild" }).getAttribute("aria-checked")) === "true" && (await page.getByRole("radio", { name: "Ausgewogen" }).getAttribute("aria-checked")) === "false");
  await page.getByRole("button", { name: "Attribute würfeln" }).click();
  const v = (await attrs()).map(Number);
  check("Wild: 90 Punkte", sum(v) === 90, v.join());
  await page.waitForTimeout(1300);
  const saves = await page.evaluate(() => window.__saves);
  const last = saves[saves.length - 1];
  check("gewürfelte Werte werden automatisch gespeichert", last && sum(Object.values(last.attrBasis)) === 90 && last.attrBasis.MU === String(v[0]), JSON.stringify(last?.attrBasis));
  await ctx.close();
}
// 3. Rückgängig: stellt den Stand davor wieder her, schrittweise; berührt Talente nicht
{
  const { ctx, page, attrs, bonuses } = await fresh();
  const start = (await attrs()).join();
  const bonusStart = (await bonuses()).join();
  await page.getByRole("button", { name: "Attribute würfeln" }).click();
  const first = (await attrs()).join();
  await page.getByRole("button", { name: "Attribute würfeln" }).click();
  check("Rückgängig ist nach dem Würfeln frei", !(await page.getByRole("button", { name: "Attribute rückgängig" }).isDisabled()));
  await page.getByRole("button", { name: "Attribute rückgängig" }).click();
  check("ein Schritt zurück: Stand nach dem ersten Wurf", (await attrs()).join() === first);
  await page.getByRole("button", { name: "Attribute rückgängig" }).click();
  check("zweiter Schritt: Ausgangswerte", (await attrs()).join() === start, start);
  check("danach wieder gesperrt", await page.getByRole("button", { name: "Attribute rückgängig" }).isDisabled());
  check("Talente blieben unberührt", (await bonuses()).join() === bonusStart);
  await ctx.close();
}
// 4. Talente: Budget 20, keine negativen, Obergrenze
{
  const { ctx, page, errors, bonuses } = await fresh();
  let ok = true;
  let nonEmpty = [];
  for (let i = 0; i < 20; i++) {
    await page.getByRole("button", { name: "Talente würfeln" }).click();
    const b = (await bonuses()).map((x) => Number(x) || 0);
    nonEmpty.push(b.filter((x) => x > 0).length);
    if (sum(b) !== 20 || b.some((x) => x < 0 || x > 19)) ok = false;
  }
  check("20 Würfe (Allrounder:in): immer genau 20 Punkte, keine negativen", ok);
  check("Allrounder:in: viele Talente mit kleinen Boni", nonEmpty.every((n) => n >= 7 && n <= 16), nonEmpty.join());
  check("Zähler zeigt 20 / 20", (await page.locator('[aria-label="Talentpunkte"]').innerText()).includes("20 / 20"));
  check("Gesamtwerte höchstens 19, keine Deckelung (*)", (await page.locator('section[aria-label="Talente"] li span:has-text("*")').count()) === 0);
  await page.getByRole("radio", { name: "Spezialist:in" }).click();
  nonEmpty = [];
  ok = true;
  for (let i = 0; i < 20; i++) {
    await page.getByRole("button", { name: "Talente würfeln" }).click();
    const b = (await bonuses()).map((x) => Number(x) || 0);
    nonEmpty.push(b.filter((x) => x > 0).length);
    if (sum(b) !== 20) ok = false;
  }
  check("Spezialist:in: 20 Punkte auf wenige Talente", ok && nonEmpty.every((n) => n >= 3 && n <= 8), nonEmpty.join());
  check("keine Seitenfehler", errors.length === 0, errors.join("|"));
  await ctx.close();
}
// 5. Talente: Rückgängig stellt die alten Boni wieder her
{
  const { ctx, page, bonuses } = await fresh();
  const start = (await bonuses()).join();
  await page.getByRole("button", { name: "Talente würfeln" }).click();
  check("Würfeln ersetzt die Talent-Boni", (await bonuses()).join() !== start);
  await page.getByRole("button", { name: "Talente rückgängig" }).click();
  check("Rückgängig bringt Klettern 5 und Singen 7 zurück", (await bonuses()).join() === start);
  await ctx.close();
}
// 6. Rassen-Boni bleiben
{
  const { ctx, page } = await fresh("?gefuellt=1&vampir=1");
  const ge = () => page.locator('section[aria-label="Attribute"] li:has(span:text-is("GE"))').locator('input[min="-19"]').inputValue();
  const before = await ge();
  await page.getByRole("button", { name: "Attribute würfeln" }).click();
  await page.getByRole("button", { name: "Talente würfeln" }).click();
  check("Vampir-Bonus auf Geschicklichkeit (+5) bleibt unangetastet", before === "5" && (await ge()) === "5", `${before} -> ${await ge()}`);
  await ctx.close();
}
// 7. Nur im Bearbeiten
{
  const { ctx, page } = await fresh();
  check("im Bearbeiten sichtbar", (await page.getByRole("button", { name: "Attribute würfeln" }).count()) === 1 && (await page.getByRole("button", { name: "Talente würfeln" }).count()) === 1);
  await page.getByRole("button", { name: "Fertig" }).click();
  check("in der Ansicht nicht vorhanden", (await page.getByRole("button", { name: "Attribute würfeln" }).count()) === 0 && (await page.getByRole("radio", { name: "Wild" }).count()) === 0);
  await ctx.close();
}
// 8. Layout: Desktop, Tablet, Handy ohne Überlauf und Überlappung
for (const [w, h] of [[1280, 800], [768, 900], [375, 800]]) {
  const { ctx, page } = await fresh("?gefuellt=1", { viewport: { width: w, height: h } });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check(`${w} px: kein seitliches Scrollen`, overflow <= 0, String(overflow));
  const boxes = await page.evaluate(() => {
    const out = {};
    for (const label of ["Attribute", "Talente"]) {
      const g = document.querySelector(`[role="group"][aria-label="${label}"]`);
      out[label] = [...g.querySelectorAll("button")].map((b) => { const r = b.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; });
    }
    return out;
  });
  const overlap = (a, b) => a[0] < b[2] - 1 && b[0] < a[2] - 1 && a[1] < b[3] - 1 && b[1] < a[3] - 1;
  let clash = false;
  for (const list of Object.values(boxes)) for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if (overlap(list[i], list[j])) clash = true;
  check(`${w} px: Knöpfe überlappen nicht`, !clash);
  const inView = Object.values(boxes).flat().every((b) => b[0] >= -1 && b[2] <= w + 1);
  check(`${w} px: Knöpfe liegen im Bild`, inView);
  if (w === 375) await page.screenshot({ path: path.join(here, ".build", "handy.png"), fullPage: false });
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(failed ? `${failed} Test(e) fehlgeschlagen` : `Alle ${results.length} Prüfungen bestanden`);
process.exit(failed ? 1 : 0);
