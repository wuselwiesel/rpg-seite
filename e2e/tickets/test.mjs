// Ticket-Postfach im echten Browser: neues Ticket mit Screenshot, Liste (Reiter, Filter, Ungelesen), Verlauf (Antworten, interne Notiz, Status, live); am Handy und am Laptop.
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
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

async function open(query, width, mobile) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, hasTouch: mobile, isMobile: mobile, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url + query);
  return { ctx, page };
}
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

for (const [label, width, mobile] of [["Handy", 375, true], ["Laptop", 1280, false]]) {
  // ---- Neues Ticket ----
  {
    const { ctx, page } = await open("?mode=form", width, mobile);
    const send = page.getByRole("button", { name: "Senden" });
    check(`${label}/Neu: Senden erst mit Titel`, await send.isDisabled());
    await page.getByRole("radio", { name: "Wunsch" }).click();
    await page.getByLabel("Titel").fill("Dunkler Modus");
    await page.getByLabel("Beschreibung").fill("Bitte im Editor");
    await page.locator('input[type="file"]').setInputFiles([{ name: "a.png", mimeType: "image/png", buffer: PNG }, { name: "b.png", mimeType: "image/png", buffer: PNG }]);
    check(`${label}/Neu: zwei Bilder als Vorschau`, (await page.locator("img").count()) === 2);
    await page.getByRole("button", { name: "Bild entfernen" }).first().click();
    check(`${label}/Neu: Bild lässt sich entfernen`, (await page.locator("img").count()) === 1);
    await send.click();
    await page.waitForTimeout(150);
    const all = await calls(page);
    const c = all.find((x) => x[0] === "create")?.[1];
    check(`${label}/Neu: sendet Art, Titel, Text und Bild-Pfad`, c?.kind === "wish" && c.title === "Dunkler Modus" && c.body === "Bitte im Editor" && c.images.length === 1 && c.images[0] === "u/0.png", JSON.stringify(c));
    check(`${label}/Neu: Gerät wird mitgeschickt`, typeof c?.device === "string" && c.device.includes(`${width}×`) && /Touch|Maus/.test(c.device) && /hell|dunkel/.test(c.device), c?.device);
    check(`${label}/Neu: danach im neuen Ticket`, JSON.stringify(all.find((x) => x[0] === "push")) === JSON.stringify(["push", "/redaktion/tickets/00000000-0000-4000-8000-000000000099"]), JSON.stringify(all));
    check(`${label}/Neu: kein seitliches Scrollen`, await noOverflow(page));
    await ctx.close();
  }
  // ---- Liste: Mitglied ----
  {
    const { ctx, page } = await open("?mode=list", width, mobile);
    check(`${label}/Liste: ohne Reiter für Mitglieder`, (await page.getByRole("tab", { name: /Eingang/ }).count()) === 0);
    const items = await page.locator("ul > li").allInnerTexts();
    check(`${label}/Liste: eigene Tickets mit Nummer, neueste zuerst`, items.length === 2 && items[0].includes("#12") && items[0].includes("Bild und Text verschmelzen") && items[1].includes("#11"), items.join("|"));
    check(`${label}/Liste: ungelesen markiert (nur #12, #11 war zuletzt von mir)`, (await page.getByLabel("Ungelesen").count()) === 1);
    await page.getByRole("tab", { name: "Erledigt" }).click();
    check(`${label}/Liste: Filter Erledigt zeigt nichts Eigenes`, (await page.locator("ul > li").count()) === 0);
    check(`${label}/Liste: kein seitliches Scrollen`, await noOverflow(page));
    await ctx.close();
  }
  // ---- Liste: Betreiberin ----
  {
    const { ctx, page } = await open("?mode=list&admin", width, mobile);
    await page.getByRole("tab", { name: /Eingang/ }).click();
    const items = await page.locator("ul > li").allInnerTexts();
    check(`${label}/Eingang: zeigt die Tickets der anderen mit Namen`, items.length === 2 && items[0].includes("#10") && items[0].includes("@sani") && items[1].includes("@nadine"), items.join("|"));
    check(`${label}/Eingang: Zähler am Reiter`, (await page.getByRole("tab", { name: /Eingang/ }).innerText()).includes("1"));
    await page.getByRole("tab", { name: "Offen" }).click();
    check(`${label}/Eingang: Filter Offen`, (await page.locator("ul > li").count()) === 1);
    await ctx.close();
  }
  // ---- Verlauf: Mitglied ----
  {
    const { ctx, page } = await open("?mode=thread", width, mobile);
    check(`${label}/Ticket: Nummer, Titel, Stand`, (await page.getByText("#12").first().isVisible()) && (await page.getByRole("heading", { name: "Bild und Text verschmelzen" }).isVisible()) && (await page.getByText("Offen").first().isVisible()));
    check(`${label}/Ticket: Beschreibung, Bild und Antwort sichtbar`, (await page.getByText("Zwei Figuren in einer Nachricht").isVisible()) && (await page.getByAltText("Screenshot").count()) === 1 && (await page.getByText("Danke, ich schaue es mir an.").isVisible()));
    check(`${label}/Ticket: keine Admin-Knöpfe, keine interne Notiz`, (await page.getByRole("button", { name: "Als Aufgabe kopieren" }).count()) === 0 && (await page.getByText("Interne Notiz").count()) === 0);
    check(`${label}/Ticket: als gelesen markiert`, (await calls(page)).some((x) => x[0] === "read"));
    await page.getByLabel("Antwort").fill("Hier der Screenshot");
    await page.locator('input[type="file"]').setInputFiles([{ name: "a.png", mimeType: "image/png", buffer: PNG }]);
    await page.getByRole("button", { name: "Senden" }).click();
    await page.waitForTimeout(150);
    const c = (await calls(page)).find((x) => x[0] === "comment");
    check(`${label}/Ticket: Antwort mit Bild senden`, c?.[2] === "Hier der Screenshot" && c[3].length === 1 && c[4] === false, JSON.stringify(c));
    // Live: Statuswechsel und neue Antwort
    await page.evaluate(() => window.__emit("tickets", "UPDATE", { id: "00000000-0000-4000-8000-000000000001", status: "done" }));
    check(`${label}/Ticket: Statuswechsel erscheint live`, await page.getByText("Erledigt").first().isVisible());
    await page.evaluate(() => window.__emit("ticket_comments", "INSERT", { id: "c9", ticket_id: "00000000-0000-4000-8000-000000000001", author_id: "admin", body: "Ist behoben", images: [], internal: false, created_at: "2026-10-17T11:00:00Z" }));
    check(`${label}/Ticket: neue Antwort erscheint live`, await page.getByText("Ist behoben").isVisible());
    check(`${label}/Ticket: kein seitliches Scrollen`, await noOverflow(page));
    await ctx.close();
  }
  // ---- Verlauf: Betreiberin ----
  {
    const { ctx, page } = await open("?mode=thread&admin", width, mobile);
    check(`${label}/Betreiberin: sieht Seite, Gerät und interne Notiz`, (await page.getByText("/story/1").isVisible()) && (await page.getByText("Handy · 375×700").isVisible()) && (await page.getByText("Erst Teil 2 fertig machen").isVisible()));
    await page.getByRole("button", { name: "Erledigt", exact: true }).click();
    await page.waitForTimeout(100);
    check(`${label}/Betreiberin: Status setzen`, JSON.stringify((await calls(page)).find((x) => x[0] === "status")) === JSON.stringify(["status", "00000000-0000-4000-8000-000000000001", "done"]));
    await page.getByLabel("Antwort").fill("Nur für mich");
    await page.getByLabel("Interne Notiz").check();
    await page.getByRole("button", { name: "Senden" }).click();
    await page.waitForTimeout(100);
    const c = (await calls(page)).find((x) => x[0] === "comment");
    check(`${label}/Betreiberin: interne Notiz senden`, c?.[2] === "Nur für mich" && c[4] === true, JSON.stringify(c));
    await page.getByRole("button", { name: "Als Aufgabe kopieren" }).click();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    check(`${label}/Betreiberin: Aufgabentext mit Nummer`, clip.startsWith("#12 Fehler: Bild und Text verschmelzen") && clip.includes("Seite: /story/1"), clip);
    check(`${label}/Betreiberin: kein seitliches Scrollen`, await noOverflow(page));
    await ctx.close();
  }
}
check("keine Seitenfehler", errors.length === 0, errors.join("|"));
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(failed ? `${failed} Prüfung(en) fehlgeschlagen` : `Alle ${results.length} Prüfungen bestanden`);
process.exit(failed ? 1 : 0);
