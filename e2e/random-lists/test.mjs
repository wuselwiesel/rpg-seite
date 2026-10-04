// Verwaltung der eigenen Zufallslisten am Laptop und Handy.
import { chromium } from "playwright-core";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./build.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined, args: ["--no-sandbox"] });
const results = [];
const check = (name, ok, extra = "") => { results.push(ok); console.log(ok ? "OK  " : "FAIL", name, extra); };
const errors = [];
const url = (q = "") => `file://${path.join(here, ".build", "index.html")}${q}`;

for (const [w, h, label] of [[1280, 800, "Laptop"], [375, 740, "Handy"]]) {
  const mobile = w < 500;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: mobile, isMobile: mobile });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url());
  const tabs = page.getByRole("tab");
  check(`${label}: neun Listen als Reiter`, (await tabs.count()) === 9, String(await tabs.count()));
  check(`${label}: Zähler „Vornamen 2“`, ((await page.getByRole("tab", { name: /Vornamen/ }).textContent()) ?? "").includes("2"));
  const items = page.getByRole("listitem");
  check(`${label}: Vornamen zeigen Zaphod und Trillian`, (await items.count()) === 2);
  check(`${label}: Löschen nur beim eigenen Eintrag`, (await page.getByRole("button", { name: /„Zaphod“ löschen/ }).count()) === 1 && (await page.getByRole("button", { name: /„Trillian“ löschen/ }).count()) === 0);

  const add = page.getByRole("button", { name: /Hinzufügen|Einträge hinzufügen/ });
  check(`${label}: Hinzufügen anfangs gesperrt`, await add.isDisabled());
  await page.getByRole("textbox").fill("Aoife\nCiaran\n\n- Niamh\naoife");
  check(`${label}: Knopf zählt die Zeilen (3 Einträge)`, ((await add.textContent()) ?? "").trim() === "3 Einträge hinzufügen", await add.textContent());
  await add.click();
  await page.getByRole("status").waitFor();
  const sent = await page.evaluate(() => window.__added.at(-1));
  check(`${label}: gesendet mit Art „vorname“`, sent?.[0] === "vorname" && sent[1].includes("Ciaran"), JSON.stringify(sent));
  check(`${label}: Meldung „3 hinzugefügt“, Feld geleert`, ((await page.getByRole("status").textContent()) ?? "").includes("3 hinzugefügt") && (await page.getByRole("textbox").inputValue()) === "");

  await page.getByRole("tab", { name: /Hobbys/ }).click();
  check(`${label}: Reiter wechselt die Liste`, (await items.count()) === 1 && (await items.first().textContent()).includes("Angeln"));
  await page.getByRole("button", { name: /löschen/ }).first().click();
  check(`${label}: Löschen ruft die Aktion auf`, (await page.evaluate(() => window.__deleted.at(-1))) === "3");
  check(`${label}: langer Eintrag ohne seitliches Scrollen`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  if (!mobile) await page.screenshot({ path: path.join(here, ".build", "desktop.png") });
  else await page.screenshot({ path: path.join(here, ".build", "mobile.png"), fullPage: true });

  // Welt-Besitzerin darf alles löschen
  await page.goto(url("?owner=1"));
  check(`${label}: Welt-Besitzerin darf auch fremde Einträge löschen`, (await page.getByRole("button", { name: /„Trillian“ löschen/ }).count()) === 1);
  await ctx.close();
}
check("keine Seitenfehler", errors.length === 0, errors.join(" | ").slice(0, 300));
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(failed ? `${failed} FEHLGESCHLAGEN` : `Alle ${results.length} Prüfungen bestanden`);
process.exit(failed ? 1 : 0);
