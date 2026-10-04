// Emoji-Fenster bleibt vollständig im sichtbaren Bereich (auch ganz unten und am Rand), am Laptop und am Handy.
import { chromium } from "playwright-core";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./build.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined, args: ["--no-sandbox"] });
const results = [];
const check = (name, ok, extra = "") => { results.push(ok); console.log(ok ? "OK  " : "FAIL", name, extra); };
const errors = [];

for (const [w, h, label] of [[1280, 800, "Laptop"], [1280, 560, "Laptop (niedrig)"], [768, 700, "Tablet"], [375, 740, "Handy"]]) {
  for (const spot of ["top", "middle", "bottom", "right"]) {
    for (const dir of ["down", "up"]) {
      const page = await (await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 500, isMobile: w < 500 })).newPage();
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.goto(`file://${path.join(here, ".build", "index.html")}?spot=${spot}&dir=${dir}`);
      await page.getByRole("button", { name: "Emojis" }).click();
      const win = page.getByText("Katalog");
      await win.waitFor();
      const box = await win.evaluate((el) => {
        let n = el; while (n && !(getComputedStyle(n).borderRadius !== "0px" && getComputedStyle(n).position === "fixed" || getComputedStyle(n).position === "absolute")) n = n.parentElement;
        const r = n.getBoundingClientRect();
        return { l: r.left, t: r.top, r: r.right, b: r.bottom, vw: innerWidth, vh: innerHeight };
      });
      const inside = box.l >= -0.5 && box.t >= -0.5 && box.r <= box.vw + 0.5 && box.b <= box.vh + 0.5;
      check(`${label}, ${spot}/${dir}: Fenster liegt vollständig im Bild`, inside, JSON.stringify(Object.fromEntries(Object.entries(box).map(([k, v]) => [k, Math.round(v)]))));
      const link = await page.getByText("Eigenes Emoji hochladen").isVisible();
      check(`${label}, ${spot}/${dir}: Knopf „Eigenes Emoji hochladen“ sichtbar`, link);
      if (label === "Laptop" && spot === "bottom" && dir === "down") await page.screenshot({ path: path.join(here, ".build", "bottom.png") });
      await page.context().close();
    }
  }
}
// Eigenes Emoji hinzufügen, auch wenn das Emoji-Fenster in einem anderen Formular steckt
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
for (const [w, h, label] of [[1280, 800, "Laptop"], [375, 740, "Handy"]]) {
  for (const inForm of [false, true]) {
    const mobile = w < 500;
    const page = await (await browser.newContext({ viewport: { width: w, height: h }, hasTouch: mobile, isMobile: mobile })).newPage();
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(`file://${path.join(here, ".build", "index.html")}?spot=middle&dir=down${inForm ? "&form=1" : ""}`);
    await page.getByRole("button", { name: "Emojis" }).click();
    await page.getByText("Eigenes Emoji hochladen").click();
    await page.locator('input[type="file"]').setInputFiles({ name: "Süße Katze.png", mimeType: "image/png", buffer: PNG });
    await page.getByPlaceholder("katze").waitFor();
    check(`${label}${inForm ? " (im Formular)" : ""}: Name wird aus der Datei vorgeschlagen`, (await page.getByPlaceholder("katze").inputValue()) === "suesse_katze");
    await page.getByRole("button", { name: "Hinzufügen" }).click();
    await page.waitForFunction(() => window.__created.length > 0, null, { timeout: 5000 }).catch(() => {});
    const created = await page.evaluate(() => window.__created.at(-1));
    check(`${label}${inForm ? " (im Formular)" : ""}: Hinzufügen lädt hoch und legt das Emoji an`, created?.[0] === "suesse_katze" && /\.png$/.test(created?.[1] ?? "") && (await page.evaluate(() => window.__uploads.length)) === 1, JSON.stringify(created));
    check(`${label}${inForm ? " (im Formular)" : ""}: das äußere Formular wird nicht abgeschickt`, (await page.evaluate(() => window.__outerSubmits)) === 0);
    check(`${label}${inForm ? " (im Formular)" : ""}: neues Emoji wird eingefügt (:suesse_katze: )`, (await page.evaluate(() => window.__picked.at(-1))) === ":suesse_katze: ");
    await page.context().close();
  }
}
// Enter im Namensfeld
{
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await page.goto(`file://${path.join(here, ".build", "index.html")}?spot=middle&dir=down&form=1`);
  await page.getByRole("button", { name: "Emojis" }).click();
  await page.getByText("Eigenes Emoji hochladen").click();
  await page.locator('input[type="file"]').setInputFiles({ name: "x.png", mimeType: "image/png", buffer: PNG });
  await page.getByPlaceholder("katze").fill("blume");
  await page.getByPlaceholder("katze").press("Enter");
  await page.waitForFunction(() => window.__created.length > 0, null, { timeout: 5000 }).catch(() => {});
  check("Enter im Namensfeld legt das Emoji an, ohne das äußere Formular abzuschicken", (await page.evaluate(() => window.__created.at(-1)?.[0])) === "blume" && (await page.evaluate(() => window.__outerSubmits)) === 0);
}
check("keine Seitenfehler", errors.length === 0, errors.join(" | ").slice(0, 300));
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(failed ? `${failed} FEHLGESCHLAGEN` : `Alle ${results.length} Prüfungen bestanden`);
process.exit(failed ? 1 : 0);
