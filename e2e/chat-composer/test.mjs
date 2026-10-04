// Chat-Raum: Eingabeleiste am Handy (ein „+“ für Emoji, Bild, GIF; große Schreibleiste) und am Laptop (alle Knöpfe sichtbar).
import { chromium } from "playwright-core";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./build.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined, args: ["--no-sandbox"] });
const results = [];
const check = (name, ok, extra = "") => { results.push(ok); console.log(ok ? "OK  " : "FAIL", name, extra); };
const errors = [];

async function open(width, height, mobile) {
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto("file://" + path.join(here, ".build", "index.html"));
  await page.locator("textarea").first().waitFor();
  return page;
}
const box = (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); return { w: r.width, h: r.height, x: r.x, y: r.y, r: r.right }; });

// ---- Handy ----
{
  const page = await open(375, 740, true);
  const ta = page.locator("textarea").first();
  const plus = page.getByRole("button", { name: "Bild, GIF oder Emoji hinzufügen" });
  check("Handy: ein „+“ statt drei Knöpfen", await plus.isVisible());
  check("Handy: GIF-, Bild- und Emoji-Knopf nicht einzeln sichtbar", !(await page.getByTitle("GIF senden").isVisible()) && !(await page.getByTitle("Bild senden").isVisible()) && !(await page.getByRole("button", { name: "Emojis", exact: true }).isVisible()));
  const b = await box(ta);
  check("Handy: Schreibleiste breit (≥ 230 px), eine Zeile hoch (46–56 px)", b.w >= 230 && b.h >= 46 && b.h <= 56, `${Math.round(b.w)}×${Math.round(b.h)}`);
  const send = page.getByRole("button", { name: "Senden" });
  check("Handy: Senden-Knopf sichtbar, innerhalb des Bildschirms", (await send.isVisible()) && (await box(send)).r <= 375);
  check("Handy: kein seitliches Scrollen", await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await plus.click();
  const menu = page.getByRole("menu");
  check("„+“ öffnet Menü mit Emoji, Bild, GIF", (await menu.getByRole("menuitem").count()) === 3 && (await menu.textContent()).includes("Medien"));
  check("Menü liegt im Bildschirm", await menu.evaluate((el) => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0; }));
  await menu.getByRole("menuitem", { name: "GIF" }).click();
  check("GIF wählen öffnet die GIF-Suche und schließt das Menü", (await page.getByRole("menu").count()) === 0 && (await page.getByPlaceholder(/suchen|Link/i).count()) > 0);
  await page.keyboard.press("Escape");
  await page.mouse.click(180, 150);
  await plus.click();
  await page.getByRole("menuitem", { name: "Emoji" }).click();
  check("Emoji wählen öffnet den Emoji-Katalog", (await page.getByText("Emoji-Katalog").count()) > 0);
  await page.screenshot({ path: path.join(here, ".build", "mobile.png") });
  await page.mouse.click(180, 100);
  await ta.fill("Hallo Welt");
  await ta.press("Enter").catch(() => {});
  await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(here, ".build", "mobile-typed.png") });
  const long = "Ein langer Text, der mehrere Zeilen braucht. ".repeat(6);
  await ta.fill(long);
  const bb = await box(ta);
  check("Handy: Schreibleiste wächst bei langem Text, aber nicht endlos (≤ 180 px)", bb.h > 60 && bb.h <= 180, `${Math.round(bb.h)}`);
  check("Handy: Senden bleibt sichtbar bei langem Text", await send.isVisible());
}

// ---- Laptop ----
{
  const page = await open(1280, 800, false);
  check("Laptop: Bild, GIF und Emoji einzeln sichtbar, kein „+“", (await page.getByTitle("Bild senden").isVisible()) && (await page.getByTitle("GIF senden").isVisible()) && (await page.getByRole("button", { name: "Emojis", exact: true }).first().isVisible()) && !(await page.getByRole("button", { name: "Bild, GIF oder Emoji hinzufügen" }).isVisible()));
  check("Laptop: Senden mit Beschriftung", (await page.getByRole("button", { name: "Senden" }).innerText()).trim() === "Senden");
  check("Laptop: kein seitliches Scrollen", await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.screenshot({ path: path.join(here, ".build", "desktop.png") });
}

const real = errors.filter((e) => !/gif-search|ERR_FAILED/.test(e));
check("keine Konsolen-/Seitenfehler", real.length === 0, real.join(" | ").slice(0, 400));
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(failed ? `${failed} FEHLGESCHLAGEN` : `Alle ${results.length} Prüfungen bestanden`);
process.exit(failed ? 1 : 0);
