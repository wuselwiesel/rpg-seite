// Verfügbarkeit und Ort: Besitzer:in setzt Frei/Beschäftigt und den Ort, andere sehen nur die Anzeige; Handy und Laptop.
import { chromium } from "playwright-core";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./build.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined, args: ["--no-sandbox"] });
const results = [];
const check = (name, ok, extra = "") => { results.push(ok); console.log(ok ? "OK  " : "FAIL", name, extra); };
const errors = [];

async function open(query, w, h, mobile) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: mobile, isMobile: mobile });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto("file://" + path.join(here, ".build", "index.html") + query);
  await page.getByText("Lyra Nachtfeder").waitFor();
  return page;
}
const calls = (page) => page.evaluate(() => window.__calls);
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

for (const [label, w, h, m] of [["Handy", 375, 740, true], ["Laptop", 1280, 800, false]]) {
  let page = await open("?role=own", w, h, m);
  check(`${label}: ohne Angabe steht „Status setzen“`, await page.getByText("Status setzen").isVisible());
  await page.getByText("Status setzen").click();
  await page.getByRole("button", { name: "Beschäftigt" }).click();
  await page.waitForTimeout(100);
  check(`${label}: Beschäftigt wird gespeichert`, JSON.stringify((await calls(page)).at(-1)) === JSON.stringify(["c1", "busy", ""]), JSON.stringify(await calls(page)));
  await page.getByLabel("Aufenthaltsort").fill("Marktplatz");
  await page.getByLabel("Aufenthaltsort").press("Enter");
  await page.waitForTimeout(100);
  check(`${label}: Ort mit Enter speichern`, JSON.stringify((await calls(page)).at(-1)) === JSON.stringify(["c1", "busy", "Marktplatz"]), JSON.stringify((await calls(page)).at(-1)));
  check(`${label}: kein seitliches Scrollen`, await noOverflow(page));

  page = await open("?role=own&a=busy&p=Marktplatz", w, h, m);
  check(`${label}: gesetzter Stand wird angezeigt`, (await page.getByText("Beschäftigt").first().isVisible()) && (await page.getByText("Marktplatz").isVisible()));
  await page.getByText("Marktplatz").click();
  await page.getByRole("button", { name: "Beschäftigt" }).last().click();
  await page.waitForTimeout(100);
  check(`${label}: erneut tippen schaltet aus`, JSON.stringify((await calls(page)).at(-1)) === JSON.stringify(["c1", null, "Marktplatz"]));
  await page.getByRole("button", { name: "Löschen" }).click();
  await page.waitForTimeout(100);
  check(`${label}: Löschen leert beides`, JSON.stringify((await calls(page)).at(-1)) === JSON.stringify(["c1", null, ""]));

  page = await open("?role=other&a=free&p=Café%20am%20alten%20Hafen%20mit%20sehr%20langem%20Namen%20damit%20es%20umbricht%20oder%20kuerzt", w, h, m);
  check(`${label}: andere sehen Verfügbar und Ort, keinen Knopf`, (await page.getByText("Verfügbar").isVisible()) && (await page.getByRole("button").count()) === 0);
  check(`${label}: langer Ort bricht nichts`, await noOverflow(page));
  await page.screenshot({ path: path.join(here, ".build", `other-${label}.png`) });
  page = await open("?role=other", w, h, m);
  check(`${label}: ohne Angabe nichts sichtbar`, (await page.getByText("Verfügbar").count()) === 0);
}

const real = errors.filter((e) => !/ERR_FAILED/.test(e));
check("keine Konsolen-/Seitenfehler", real.length === 0, real.join(" | ").slice(0, 400));
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(failed ? `${failed} FEHLGESCHLAGEN` : `Alle ${results.length} Prüfungen bestanden`);
process.exit(failed ? 1 : 0);
