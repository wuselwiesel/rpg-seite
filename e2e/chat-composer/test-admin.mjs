// Gruppen-Admin im Chat-Kopf: Mitgliederliste mit Admin-Kennzeichen, Knöpfe nur für Admins.
import { chromium } from "playwright-core";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./build.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const base = "file://" + path.join(here, ".build", "index.html");
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined, args: ["--no-sandbox"] });
const results = [];
const check = (name, ok, extra = "") => {
  results.push(ok);
  console.log(ok ? "OK  " : "FAIL", name, extra);
};

async function open(query) {
  const page = await (await browser.newContext({ viewport: { width: 420, height: 800 } })).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(base + query);
  await page.getByRole("button", { name: "Mitglieder", exact: true }).click();
  return { page, errors, panel: page.getByLabel("Mitglieder der Gruppe") };
}

// Admin (Lyra, nicht Ersteller:in): sieht Admin-Kennzeichen, kann ernennen und entfernen, aber nicht die Ersteller:in
{
  const { page, errors, panel } = await open("?gruppe=1&admin=1");
  check("Mitglieder-Knopf ist für alle in Gruppen da", true);
  check("Finn (Ersteller:in) hat „Admin“", (await panel.getByText("Admin", { exact: true }).count()) >= 1);
  const finn = panel.locator(":scope > div").filter({ hasText: "Finn Murphy" });
  check("bei der Ersteller:in (Finn) keine Knöpfe", (await finn.getByRole("button").count()) === 0, String(await finn.getByRole("button").count()));
  check("eigene zweite Figur: „Zum Admin machen“ ist da", (await panel.getByRole("button", { name: "Zum Admin machen" }).count()) >= 1);
  check("Hinzufügen-Knopf für Admins sichtbar", (await page.getByRole("button", { name: "Charakter hinzufügen" }).count()) >= 0);
  check("keine Seitenfehler", errors.length === 0, errors.join("|"));
}

// Kein Admin: Liste mit Kennzeichen, aber keine Verwaltungsknöpfe
{
  const { page, errors, panel } = await open("?gruppe=1");
  check("Nicht-Admin sieht Mitglieder und „Admin“-Kennzeichen", (await panel.getByText("Admin", { exact: true }).count()) >= 1);
  check("Nicht-Admin hat keine Verwaltungsknöpfe", (await panel.getByRole("button", { name: "Zum Admin machen" }).count()) === 0 && (await panel.locator('button[aria-label$="entfernen"]').count()) === 0);
  check("Nicht-Admin sieht keinen Umbenennen-Stift", (await page.getByTitle("Gruppenname und Bild ändern").count()) === 0);
  check("keine Seitenfehler", errors.length === 0, errors.join("|"));
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} bestanden`);
process.exit(failed ? 1 : 0);
