// Charakter-Prüfung: Admin genehmigt/lehnt ab/schlägt Änderungen vor, Besitzer:in übernimmt/lehnt ab/reicht erneut ein; am Handy und am Laptop.
import { chromium } from "playwright-core";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./build.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined, args: ["--no-sandbox"] });
const results = [];
const check = (name, ok, extra = "") => { results.push(ok); console.log(ok ? "OK  " : "FAIL", name, extra); };
const errors = [];

async function open(query, width = 375, height = 740, mobile = true) {
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: mobile, isMobile: mobile });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto("file://" + path.join(here, ".build", "index.html") + query);
  await page.getByText(/Zur Prüfung|Genehmigt|Abgelehnt/).first().waitFor();
  return page;
}
const calls = (page) => page.evaluate(() => window.__calls);
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

for (const [label, w, h, m] of [["Handy", 375, 740, true], ["Laptop", 1280, 800, false]]) {
  // ---- Genehmigter Charakter: keine Entscheidung mehr, Vorschläge weiter möglich ----
  {
    const page = await open("?role=admin&status=approved", w, h, m);
    check(`${label}/Genehmigt: Stand „Genehmigt“, kein Genehmigen oder Ablehnen mehr`, (await page.getByText("Genehmigt", { exact: true }).first().isVisible()) && (await page.getByRole("button", { name: "Genehmigen" }).count()) === 0 && (await page.getByRole("button", { name: "Ablehnen", exact: true }).count()) === 0);
    check(`${label}/Genehmigt: Angaben zum Ändern bleiben`, await page.getByRole("button", { name: "Name ändern", exact: true }).isVisible());
    await page.context().close();
  }
  // ---- Admin ----
  let page = await open("?role=admin&status=pending", w, h, m);
  check(`${label}/Admin: Genehmigen und Ablehnen sichtbar`, (await page.getByRole("button", { name: "Genehmigen" }).isVisible()) && (await page.getByRole("button", { name: "Ablehnen", exact: true }).first().isVisible()));
  check(`${label}/Admin: kein seitliches Scrollen`, await noOverflow(page));
  await page.getByRole("button", { name: "Genehmigen" }).click();
  await page.waitForTimeout(100);
  check(`${label}/Admin: Genehmigen ruft die Aktion auf`, JSON.stringify((await calls(page)).at(-1)) === JSON.stringify(["review", "c1", "approved", ""]), JSON.stringify(await calls(page)));
  await page.getByRole("button", { name: "Ablehnen", exact: true }).first().click();
  const send = page.getByRole("button", { name: "Ablehnen senden" });
  check(`${label}/Admin: Ablehnen braucht einen Hinweis`, await send.isDisabled());
  await page.getByLabel("Hinweis zur Ablehnung").fill("Hintergrund fehlt");
  await send.click();
  await page.waitForTimeout(100);
  check(`${label}/Admin: Ablehnen sendet den Hinweis`, JSON.stringify((await calls(page)).at(-1)) === JSON.stringify(["review", "c1", "rejected", "Hintergrund fehlt"]));

  const body = await page.locator("section[aria-label='Angaben']").innerText();
  check(`${label}/Admin: alle Angaben stehen gleich auf der Seite (Profil, Bogen, Attribute, Talente, Notizen)`, ["Name", "Lyra Nachtfeder", "Kurzbeschreibung", "Mut: Basiswert", "Notizen"].every((x) => body.includes(x)) && /Bonus/.test(body), body.length + " Zeichen");
  await page.getByRole("button", { name: "Name ändern", exact: true }).click();
  check(`${label}/Admin: Feld zeigt den aktuellen Wert`, (await page.getByLabel("Neuer Wert").inputValue()) === "Lyra Nachtfeder");
  await page.getByLabel("Neuer Wert").fill("Lyra Dunkelwald");
  await page.getByLabel("Hinweis", { exact: true }).fill("Klingt besser");
  await page.getByRole("button", { name: "Vorschlagen" }).click();
  await page.waitForTimeout(100);
  check(`${label}/Admin: Vorschlag wird gesendet`, JSON.stringify((await calls(page)).at(-1)) === JSON.stringify(["propose", "c1", "p:name", "Lyra Dunkelwald", "Klingt besser"]), JSON.stringify((await calls(page)).at(-1)));
  check(`${label}/Admin: Zurückziehen statt Übernehmen`, (await page.getByRole("button", { name: "Zurückziehen" }).isVisible()) && !(await page.getByRole("button", { name: "Übernehmen" }).count()));
  await page.getByRole("button", { name: "Zurückziehen" }).click();
  await page.waitForTimeout(100);
  check(`${label}/Admin: Zurückziehen ruft die Aktion auf`, JSON.stringify((await calls(page)).at(-1)) === JSON.stringify(["decide", "p1", "withdrawn"]));
  check(`${label}/Admin: kein seitliches Scrollen (mit Vorschlag)`, await noOverflow(page));
  await page.screenshot({ path: path.join(here, ".build", `admin-${label}.png`), fullPage: true });

  // ---- Besitzer:in ----
  page = await open("?role=owner&status=rejected", w, h, m);
  check(`${label}/Besitzer:in: Hinweis der Ablehnung sichtbar`, await page.getByText("Bitte Hintergrund ergänzen").isVisible());
  check(`${label}/Besitzer:in: keine Admin-Knöpfe`, !(await page.getByRole("button", { name: "Genehmigen" }).count()) && !(await page.getByText("Änderung vorschlagen").count()));
  await page.getByRole("button", { name: "Erneut einreichen" }).click();
  await page.waitForTimeout(100);
  check(`${label}/Besitzer:in: erneut einreichen`, JSON.stringify((await calls(page)).at(-1)) === JSON.stringify(["resubmit", "c1"]));
  check(`${label}/Besitzer:in: alt und neu nebeneinander`, (await page.getByText("Lyra Nachtfeder-Hohenzollern der Zweiten von Irgendwo").isVisible()) && (await page.getByText("Lyra", { exact: true }).first().isVisible()));
  await page.getByRole("button", { name: "Übernehmen" }).click();
  await page.waitForTimeout(100);
  check(`${label}/Besitzer:in: Übernehmen`, JSON.stringify((await calls(page)).at(-1)) === JSON.stringify(["decide", "p1", "accepted"]));
  await page.getByRole("button", { name: "Ablehnen", exact: true }).click();
  await page.waitForTimeout(100);
  check(`${label}/Besitzer:in: Vorschlag ablehnen`, JSON.stringify((await calls(page)).at(-1)) === JSON.stringify(["decide", "p1", "declined"]));
  check(`${label}/Besitzer:in: Erledigtes steht darunter`, await page.getByText("Übernommen").isVisible());
  check(`${label}/Besitzer:in: kein seitliches Scrollen`, await noOverflow(page));
  await page.screenshot({ path: path.join(here, ".build", `owner-${label}.png`), fullPage: true });
}

const real = errors.filter((e) => !/ERR_FAILED/.test(e));
check("keine Konsolen-/Seitenfehler", real.length === 0, real.join(" | ").slice(0, 400));
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(failed ? `${failed} FEHLGESCHLAGEN` : `Alle ${results.length} Prüfungen bestanden`);
process.exit(failed ? 1 : 0);
