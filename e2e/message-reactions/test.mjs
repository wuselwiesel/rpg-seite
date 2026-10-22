// Reaktions-Knopf im Chat erscheint erst, wenn man die Nachricht antippt.
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
const page = await (await browser.newContext({ viewport: { width: 420, height: 600 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(url);
const add = (id) => page.locator(`#${id}`).getByRole("button", { name: "Reaktion hinzufügen" });

check("ohne Antippen kein Knopf (ohne Reaktion)", (await add("m1").count()) === 0);
check("ohne Antippen kein Knopf (mit Reaktion), die Reaktion bleibt sichtbar", (await add("m2").count()) === 0 && (await page.locator("#m2").getByText("👍").count()) === 1);
await page.locator("#m1").getByText("Ohne Reaktion").click();
await add("m1").waitFor({ timeout: 1000 });
check("Antippen zeigt den Knopf", true);
await page.waitForTimeout(450);
await page.locator("#m1").getByText("Ohne Reaktion").click();
await page.waitForTimeout(100);
check("erneutes Antippen blendet ihn wieder aus", (await add("m1").count()) === 0);
await page.locator("#m2").getByText("Mit Reaktion").click();
await add("m2").waitFor({ timeout: 1000 });
check("auch bei vorhandener Reaktion erst nach Antippen", true);
check("keine Seitenfehler", errors.length === 0, errors.join("|"));
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} bestanden`);
process.exit(failed ? 1 : 0);
