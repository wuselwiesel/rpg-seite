// Formular „Neuer Charakter“: NPC-Schalter, Komplett würfeln (Name, Wesen, Kurzbeschreibung, Bogen), abgeschickte Daten.
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
const TAKEN = ["anna", "ben", "lucian", "mia", "noah", "emilia", "felix", "greta", "hannah", "ida", "jonas", "klara", "luca"];

async function fresh(query = "", opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 1000 }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url + query);
  await page.getByRole("button", { name: "Komplett würfeln" }).waitFor();
  const sheet = () => page.locator('input[name="sheet_json"]').inputValue().then((v) => (v ? JSON.parse(v) : null));
  return { ctx, page, errors, sheet };
}
const sum = (o) => Object.values(o).reduce((s, v) => s + (Number(v) || 0), 0);

{
  const { ctx, page, errors, sheet } = await fresh();
  check("Kein Feld „Charakterbogen-Link“ mehr", (await page.getByText("Charakterbogen-Link").count()) === 0 && (await page.locator('input[name="sheet_url"]').count()) === 0);
  check("NPC-Schalter vorhanden, anfangs aus", (await page.getByRole("checkbox", { name: "NPC" }).count()) === 1 && !(await page.getByRole("checkbox", { name: "NPC" }).isChecked()));
  check("Knopf heißt zunächst „Charakter erschaffen“", (await page.getByRole("button", { name: "Charakter erschaffen" }).count()) === 1);
  await page.getByRole("checkbox", { name: "NPC" }).check();
  check("Mit NPC-Schalter heißt er „NPC erschaffen“", (await page.getByRole("button", { name: "NPC erschaffen" }).count()) === 1);

  check("vor dem Würfeln ist der Name leer", (await page.locator('input[name="name"]').inputValue()) === "");
  await page.getByRole("button", { name: "Komplett würfeln" }).click();
  const name = await page.locator('input[name="name"]').inputValue();
  check("Komplett würfeln füllt den Namen (Vor- und Nachname)", name.trim().split(" ").length >= 2, name);
  const s1 = await sheet();
  check("Bogen: 90 Attribut- und 20 Talentpunkte, Wesen und Felder gefüllt", s1 && sum(s1.attrBasis) === 90 && sum(s1.talentBonus) === 20 && s1.personalFields.find((f) => f.label === "Wesen")?.value, JSON.stringify({ a: sum(s1?.attrBasis ?? {}), t: sum(s1?.talentBonus ?? {}) }));
  const species = await page.locator('select[name="species"]').inputValue();
  const wesen = s1.personalFields.find((f) => f.label === "Wesen").value;
  check("Wesen-Auswahl passt zum Bogen", ({ Mensch: "mensch", Werwolf: "werwolf", Vampir: "vampir" })[wesen] === species, `${wesen}/${species}`);
  const bio = await page.locator('textarea[name="bio"]').inputValue();
  check("Kurzbeschreibung ist gesetzt", bio.trim().length > 0, bio);

  // Mehrfach würfeln: andere Namen, keine vergebenen Vornamen, Wesen kommen alle vor
  const names = new Set([name]);
  const kinds = new Set([species]);
  let taken = false;
  for (let i = 0; i < 80; i++) {
    await page.getByRole("button", { name: "Komplett würfeln" }).click();
    const n = await page.locator('input[name="name"]').inputValue();
    names.add(n);
    kinds.add(await page.locator('select[name="species"]').inputValue());
    if (TAKEN.includes(n.split(" ")[0].toLowerCase())) taken = true;
  }
  check("80 weitere Würfe: viele verschiedene Namen", names.size > 40, String(names.size));
  check("…nie ein Vorname, den es in der Welt schon gibt", !taken);
  check("…und alle drei Wesen kamen vor", kinds.size === 3, [...kinds].join());

  // Abschicken
  await page.getByRole("button", { name: "NPC erschaffen" }).click();
  await page.waitForTimeout(150);
  const sent = await page.evaluate(() => window.__created[0]);
  check("Gesendet: NPC-Schalter, Name, Bogen als JSON", sent && sent.is_npc === "on" && sent.name && sent.sheet_json && JSON.parse(sent.sheet_json).race !== undefined, JSON.stringify(Object.keys(sent ?? {})));
  check("keine Seitenfehler", errors.length === 0, errors.join("|"));
  await ctx.close();
}
{
  // Ohne NPC-Schalter: kein is_npc, trotzdem Würfeln möglich
  const { ctx, page } = await fresh();
  await page.locator('input[name="name"]').fill("Handgemacht");
  await page.getByRole("button", { name: "Charakter erschaffen" }).click();
  await page.waitForTimeout(150);
  const sent = await page.evaluate(() => window.__created[0]);
  check("Ohne Schalter wird kein NPC gesendet, ohne Bogen (leer)", sent && sent.is_npc === undefined && sent.sheet_json === "", JSON.stringify(sent));
  await ctx.close();
}
{
  const { ctx, page } = await fresh("?npc=1");
  check("Mit ?npc=1 ist der Schalter schon an", await page.getByRole("checkbox", { name: "NPC" }).isChecked());
  await ctx.close();
}
{
  const { ctx, page } = await fresh("?welcome=1&npc=1");
  check("Beim ersten Charakter (Willkommen) gibt es keinen NPC-Schalter", (await page.getByRole("checkbox", { name: "NPC" }).count()) === 0);
  await ctx.close();
}
{
  // Eigene Einträge der Welt
  const { ctx, page } = await fresh("?eigene=1");
  const names = new Set();
  for (let i = 0; i < 60; i++) {
    await page.getByRole("button", { name: "Komplett würfeln" }).click();
    names.add(await page.locator('input[name="name"]').inputValue());
  }
  check("Eigene Vor- und Nachnamen der Welt kommen vor", [...names].some((n) => n.includes("Zaphod")) && [...names].some((n) => n.includes("Beeblebrox")));
  await ctx.close();
}
for (const [w, h] of [[1280, 900], [768, 900], [375, 800]]) {
  const { ctx, page } = await fresh("", { viewport: { width: w, height: h } });
  await page.getByRole("button", { name: "Komplett würfeln" }).click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check(`${w} px: kein seitliches Scrollen`, overflow <= 0, String(overflow));
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(failed ? `${failed} Test(e) fehlgeschlagen` : `Alle ${results.length} Prüfungen bestanden`);
process.exit(failed ? 1 : 0);
