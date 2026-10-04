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
check("keine Seitenfehler", errors.length === 0, errors.join(" | ").slice(0, 300));
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(failed ? `${failed} FEHLGESCHLAGEN` : `Alle ${results.length} Prüfungen bestanden`);
process.exit(failed ? 1 : 0);
