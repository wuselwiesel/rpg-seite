// Meldungen im echten Browser: Formular (Art, Titel, Gerät wird mitgeschickt, Fehlermeldung) und Eingang (Filter, Status setzen, kopieren); am Handy und am Laptop.
import { chromium } from "playwright-core";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./build.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const url = "file://" + path.join(here, ".build", "index.html");
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined, args: ["--no-sandbox"] });
const results = [];
const check = (name, ok, extra = "") => { results.push(ok); console.log(ok ? "OK  " : "FAIL", name, extra); };
const errors = [];
const calls = (page) => page.evaluate(() => window.__calls);

async function open(query, width, mobile) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, hasTouch: mobile, isMobile: mobile, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url + query);
  return { ctx, page };
}
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

for (const [label, width, mobile] of [["Handy", 375, true], ["Laptop", 1280, false]]) {
  // ---- Formular ----
  {
    const { ctx, page } = await open("", width, mobile);
    const send = page.getByRole("button", { name: "Senden" });
    check(`${label}/Formular: Senden erst mit Titel`, await send.isDisabled());
    await page.getByRole("radio", { name: "Wunsch" }).click();
    check(`${label}/Formular: Art wählbar`, (await page.getByRole("radio", { name: "Wunsch" }).getAttribute("aria-checked")) === "true");
    await page.getByLabel("Titel").fill("Dunkler Modus");
    await page.getByLabel("Beschreibung").fill("Bitte im Editor");
    await page.getByLabel("Seite").fill("/wiki/neu");
    await send.click();
    await page.waitForTimeout(100);
    const c = (await calls(page)).at(-1);
    check(`${label}/Formular: sendet Art, Titel, Text, Seite`, c?.[0] === "create" && c[1].kind === "wish" && c[1].title === "Dunkler Modus" && c[1].body === "Bitte im Editor" && c[1].page === "/wiki/neu", JSON.stringify(c));
    check(`${label}/Formular: Gerät wird mitgeschickt`, typeof c?.[1].device === "string" && c[1].device.includes(`${width}×`) && /Touch|Maus/.test(c[1].device) && /hell|dunkel/.test(c[1].device), c?.[1].device);
    check(`${label}/Formular: Felder sind danach leer`, (await page.getByLabel("Titel").inputValue()) === "" && (await page.getByLabel("Beschreibung").inputValue()) === "");
    check(`${label}/Formular: kein seitliches Scrollen`, await noOverflow(page));
    await ctx.close();
  }
  // ---- Eingang ----
  {
    const { ctx, page } = await open("?mode=inbox", width, mobile);
    let items = await page.locator("ul > li").allInnerTexts();
    check(`${label}/Eingang: zeigt zuerst nur Offenes`, items.length === 1 && items[0].includes("Bild und Text verschmelzen"), items.join("|"));
    await page.getByRole("tab", { name: /^Alle \d/ }).click();
    check(`${label}/Eingang: Alle zeigt drei`, (await page.locator("ul > li").count()) === 3);
    await page.getByRole("tab", { name: "Wunsch" }).click();
    check(`${label}/Eingang: Art filtert`, (await page.locator("ul > li").count()) === 1);
    await page.getByRole("tab", { name: "Alle Arten" }).click();
    await page.getByRole("tab", { name: /^Offen/ }).click();
    await page.getByRole("button", { name: /Bild und Text verschmelzen/ }).click();
    check(`${label}/Eingang: aufgeklappt zeigt Text, Seite und Gerät`, (await page.getByText("Zwei Figuren in einer Nachricht").isVisible()) && (await page.getByText("/story/1").isVisible()) && (await page.getByText("Handy · 375×700").isVisible()));
    await page.getByRole("button", { name: "Als Aufgabe kopieren" }).click();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    check(`${label}/Eingang: Aufgabentext in der Zwischenablage`, clip.startsWith("Fehler: Bild und Text verschmelzen") && clip.includes("Von: Mira") && clip.includes("Seite: /story/1"), clip);
    await page.getByRole("button", { name: "Erledigt", exact: true }).click();
    await page.waitForTimeout(100);
    const c = (await calls(page)).at(-1);
    check(`${label}/Eingang: Status setzen`, JSON.stringify(c) === JSON.stringify(["status", "t1", "done"]), JSON.stringify(c));
    check(`${label}/Eingang: kein seitliches Scrollen`, await noOverflow(page));
    await ctx.close();
  }
}
check("keine Seitenfehler", errors.length === 0, errors.join("|"));
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(failed ? `${failed} Prüfung(en) fehlgeschlagen` : `Alle ${results.length} Prüfungen bestanden`);
process.exit(failed ? 1 : 0);
