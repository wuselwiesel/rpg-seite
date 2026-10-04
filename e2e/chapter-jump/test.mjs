// Kapitel-Sprung: erscheint erst, wenn die Kapitelleiste oben aus dem Bild ist; öffnet eine Liste; ein Klick führt zum Kapitel, auch wenn es in eingeklappten Beiträgen steckt.
import { chromium } from "playwright-core";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./build.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined, args: ["--no-sandbox"] });
const results = [];
const check = (name, ok, extra = "") => { results.push(ok); console.log(ok ? "OK  " : "FAIL", name, extra); };
const errors = [];

for (const [w, h, label] of [[1280, 700, "Laptop"], [375, 740, "Handy"]]) {
  const page = await (await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 500, isMobile: w < 500 })).newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto("file://" + path.join(here, ".build", "index.html"));
  const jump = page.getByRole("button", { name: "Zu einem Kapitel springen" });
  await page.waitForTimeout(300);
  check(`${label}: ganz oben (Leiste sichtbar) kein schwebender Knopf`, (await jump.count()) === 0);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await jump.waitFor({ timeout: 3000 });
  check(`${label}: unten erscheint der Knopf`, true);
  const box = await jump.boundingBox();
  check(`${label}: Knopf liegt im Bild`, box.x >= 0 && box.x + box.width <= w && box.y >= 0 && box.y + box.height <= h);
  check(`${label}: Kapitel 1 ist eingeklappt (nicht sichtbar)`, !(await page.locator("#kapitel-1").isVisible()));
  await jump.click();
  const items = page.locator('ul a[href^="#kapitel-"]');
  check(`${label}: Liste mit 2 Kapiteln`, (await items.count()) === 2);
  await items.nth(1).click();
  await page.waitForTimeout(1200);
  const vis = await page.locator("#kapitel-2").isVisible();
  const top = await page.locator("#kapitel-2").evaluate((e) => Math.round(e.getBoundingClientRect().top));
  check(`${label}: Sprung zu Kapitel 2 klappt auf und scrollt hin`, vis && top >= 0 && top < h, `top=${top}`);
  check(`${label}: Liste schließt nach dem Klick`, (await page.locator("ul a[href^='#kapitel-']").count()) === 0);
  check(`${label}: kein seitliches Scrollen`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.screenshot({ path: path.join(here, `.build/${label}.png`) });
}
check("keine Konsolenfehler", errors.length === 0, errors.join(" | "));
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
