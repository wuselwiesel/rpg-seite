// Redaktions-Abzeichen am Laptop und Handy: Formular (Account-Ebene), Verleihen an Freund:innen.
import { chromium } from "playwright-core";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./build.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined, args: ["--no-sandbox"] });
const results = [];
const check = (name, ok, extra = "") => { results.push(ok); console.log(ok ? "OK  " : "FAIL", name, extra); };
const errors = [];

for (const [w, h, label] of [[1280, 800, "Laptop"], [375, 740, "Handy"]]) {
  const mobile = w < 500;
  const page = await (await browser.newContext({ viewport: { width: w, height: h }, hasTouch: mobile, isMobile: mobile })).newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("file://" + path.join(here, ".build", "index.html"));
  await page.getByRole("button", { name: "Badge anlegen" }).waitFor();
  check(`${label}: Formular legt auf Account-Ebene an (scope=account)`, (await page.locator('input[name="scope"]').inputValue()) === "account");
  check(`${label}: keine erklärenden Sätze im Formular`, !((await page.locator("form").textContent()) ?? "").includes("Als Symbol wählst du"));
  await page.getByLabel("Name").fill("Ritter der Redaktion");
  await page.getByRole("button", { name: "Badge anlegen" }).click();
  await page.waitForFunction(() => window.__created.length > 0);
  const created = await page.evaluate(() => window.__created[0]);
  check(`${label}: gesendet mit Name, Symbol, Farbe und scope`, created.name === "Ritter der Redaktion" && created.scope === "account" && created.icon && /^#[0-9a-f]{6}$/i.test(created.color), JSON.stringify(created));

  const award = page.locator("#award");
  const select = award.getByLabel("Person, die das Badge bekommt");
  check(`${label}: Auswahl zeigt die Freund:innen`, (await select.locator("option").allTextContents()).join("|") === "Finn|Aoife");
  await select.selectOption("f2");
  await award.getByRole("button", { name: "Verleihen" }).click();
  await award.getByRole("status").waitFor();
  check(`${label}: Verleihen ruft die Aktion mit Badge und Person auf`, JSON.stringify(await page.evaluate(() => window.__awarded.at(-1))) === '["def1","f2"]');
  await page.evaluate(() => { window.__fail = true; });
  await award.getByRole("button", { name: "Verleihen" }).click();
  await award.getByText("Du kannst nur an Freund:innen verleihen.").waitFor();
  check(`${label}: Fehlermeldung der Aktion wird gezeigt`, true);
  check(`${label}: ohne Freund:innen keine Verleihen-Leiste`, (await page.locator("#none button").count()) === 0);
  check(`${label}: kein seitliches Scrollen`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  if (mobile) await page.screenshot({ path: path.join(here, ".build", "mobile.png"), fullPage: true });
  await page.context().close();
}
check("keine Seitenfehler", errors.length === 0, errors.join(" | ").slice(0, 300));
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(failed ? `${failed} FEHLGESCHLAGEN` : `Alle ${results.length} Prüfungen bestanden`);
process.exit(failed ? 1 : 0);
