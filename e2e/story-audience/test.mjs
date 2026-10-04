// Story-Viewer: „Gesehen von“ nur für die Besitzerin; Ansichten werden eingetragen (nur bei fremden Storys).
import { chromium } from "playwright-core";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./build.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined, args: ["--no-sandbox"] });
const results = [];
const check = (name, ok, extra = "") => { results.push(ok); console.log(ok ? "OK  " : "FAIL", name, extra); };
const errors = [];
const url = (as) => `file://${path.join(here, ".build", "index.html")}?as=${as}`;

for (const [w, h, label] of [[1280, 800, "Laptop"], [375, 740, "Handy"]]) {
  const mobile = w < 500;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: mobile, isMobile: mobile });
  // Besitzerin
  let page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url("owner"));
  await page.getByRole("button", { name: "Story öffnen" }).click();
  const btn = page.getByRole("button", { name: "Wer hat die Story gesehen?" });
  await btn.waitFor();
  await page.waitForFunction(() => document.querySelector('[aria-label="Wer hat die Story gesehen?"]')?.textContent?.includes("3"));
  check(`${label}: Besitzerin sieht Zähler (3 Charaktere gesehen, 2 Herzen)`, ((await btn.textContent()) ?? "").replace(/\s/g, "") === "32", await btn.textContent());
  check(`${label}: Besitzerin trägt keine Ansicht ein`, (await page.evaluate(() => window.__upserts.length)) === 0);
  await btn.click();
  const dialog = page.getByRole("dialog", { name: "Gesehen von" });
  await dialog.waitFor();
  const names = await dialog.locator("li").allTextContents();
  check(`${label}: Liste zeigt alle Charaktere (Finn, Aoife, Rory)`, ["Finn Murphy", "Aoife Walsh", "Rory Quinn"].every((n) => names.some((t) => t.includes(n))) && names.length === 3, names.join("|"));
  check(`${label}: Herz bei Aoife und Rory, nicht bei Finn`, (await dialog.locator("li", { hasText: "Aoife" }).locator('[aria-label="Gefällt"]').count()) === 1 && (await dialog.locator("li", { hasText: "Rory" }).locator('[aria-label="Gefällt"]').count()) === 1 && (await dialog.locator("li", { hasText: "Finn" }).locator('[aria-label="Gefällt"]').count()) === 0);
  const box = await dialog.evaluate((el) => { const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, b: r.bottom, vw: innerWidth, vh: innerHeight }; });
  check(`${label}: Fenster liegt im Bild`, box.l >= 0 && box.r <= box.vw && box.b <= box.vh);
  check(`${label}: kein seitliches Scrollen`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  if (!mobile) await page.screenshot({ path: path.join(here, ".build", "owner.png") });
  await dialog.getByRole("button", { name: "Schließen" }).click();
  check(`${label}: Schließen blendet das Fenster aus`, (await dialog.count()) === 0);
  await page.close();

  // Betrachtende
  page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url("viewer"));
  await page.getByRole("button", { name: "Story öffnen" }).click();
  await page.getByLabel("Auf die Story antworten").waitFor();
  await page.waitForFunction(() => window.__upserts.length > 0);
  const up = await page.evaluate(() => window.__upserts[0]);
  check(`${label}: Betrachtende wird als Ansicht eingetragen`, up[0] === "story_views" && up[1].story_id === "s1" && up[1].character_id === "viewer" && up[2].ignoreDuplicates === true, JSON.stringify(up));
  check(`${label}: Betrachtende sieht keine Liste`, (await page.getByRole("button", { name: "Wer hat die Story gesehen?" }).count()) === 0);
  await ctx.close();
}
check("keine Seitenfehler", errors.length === 0, errors.join(" | ").slice(0, 300));
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(failed ? `${failed} FEHLGESCHLAGEN` : `Alle ${results.length} Prüfungen bestanden`);
process.exit(failed ? 1 : 0);
