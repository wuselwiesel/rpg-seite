// Profilbild antippen → groß, schließen per Tipp und Esc.
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
const page = await (await browser.newContext({ viewport: { width: 400, height: 700 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(url);
check("Bild ohne URL ist nicht anklickbar", (await page.locator("#b button").count()) === 0);
await page.getByRole("button", { name: "Profilbild von Dana Grey vergrößern" }).click();
const dialog = page.getByRole("dialog", { name: "Profilbild von Dana Grey" });
await dialog.waitFor();
const box = await dialog.locator("img").boundingBox();
check("Bild ist groß und im Bildschirm", box && box.width > 200 && box.x >= 0 && box.x + box.width <= 400, JSON.stringify(box));
check("Name steht darunter", (await dialog.getByText("Dana Grey").count()) >= 1);
await page.keyboard.press("Escape");
check("Esc schließt", (await dialog.count()) === 0);
await page.getByRole("button", { name: "Profilbild von Dana Grey vergrößern" }).click();
await dialog.waitFor();
await page.mouse.click(5, 650);
check("Tipp daneben schließt", (await dialog.count()) === 0);
check("keine Seitenfehler", errors.length === 0, errors.join("|"));
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} bestanden`);
process.exit(failed ? 1 : 0);
