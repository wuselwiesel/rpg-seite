// @ im Wiki-Editor im echten Browser: Liste öffnen, filtern, mit Enter oder Klick einfügen, neue Seite anbieten.
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

async function fresh() {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 700 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url);
  const ed = page.locator(".ProseMirror");
  await ed.click();
  return { ctx, page, ed, errors, out: () => page.locator("#out").innerText() };
}

// 1. @ öffnet die Liste, Eingabe filtert, Enter fügt [[Titel]] ein
{
  const { ctx, page, ed, errors, out } = await fresh();
  await ed.pressSequentially("Siehe @vamp");
  const popup = page.locator("[data-mention-popup]");
  await popup.waitFor({ timeout: 2000 });
  const items = await popup.locator('[role="option"]').allInnerTexts();
  check("Liste zeigt passende Seiten und „neue Seite“", items.length === 3 && items[0].includes("Vampire") && items[2].includes("Neue Seite"), JSON.stringify(items));
  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);
  check("Enter fügt [[Vampire]] ein", (await out()).includes("[[Vampire]]"), await out());
  check("Liste ist danach zu", (await popup.count()) === 0);
  check("Enter schickt nichts ab und macht keinen Absatz, solange die Liste offen war", !(await out()).includes("</p><p>"));
  check("keine Seitenfehler", errors.length === 0, errors.join("|"));
  await ctx.close();
}
// 2. Pfeiltasten wählen den zweiten Eintrag, Klick geht auch
{
  const { ctx, page, ed, out } = await fresh();
  await ed.pressSequentially("@vamp");
  await page.locator("[data-mention-popup]").waitFor();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  check("Pfeil runter wählt die zweite Seite", (await out()).includes("[[Alte Vampirburg]]"), await out());
  await ed.pressSequentially(" und @nebel");
  await page.locator('[data-mention-popup] [role="option"]', { hasText: "Nebelhafen" }).click();
  check("Klick fügt ein", (await out()).includes("[[Nebelhafen]]"), await out());
  await ctx.close();
}
// 3. Unbekannter Titel: neue Seite wird als roter Link angeboten
{
  const { ctx, page, ed, out } = await fresh();
  await ed.pressSequentially("@Hexenzirkel");
  const opt = page.locator('[data-mention-popup] [role="option"]');
  await opt.first().waitFor();
  check("nur „Neue Seite“ angeboten", (await opt.count()) === 1 && (await opt.first().innerText()).includes("Hexenzirkel"));
  await page.keyboard.press("Enter");
  check("fügt [[Hexenzirkel]] ein", (await out()).includes("[[Hexenzirkel]]"), await out());
  await ctx.close();
}
// 4. Escape schließt die Liste und lässt den Text stehen
{
  const { ctx, page, ed, out } = await fresh();
  await ed.pressSequentially("@vamp");
  await page.locator("[data-mention-popup]").waitFor();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);
  check("Escape schließt die Liste", (await page.locator("[data-mention-popup]").count()) === 0);
  check("Text bleibt", (await out()).includes("@vamp"), await out());
  await ctx.close();
}
// 5. E-Mail-Adressen lösen die Liste nicht aus
{
  const { ctx, page, ed } = await fresh();
  await ed.pressSequentially("schreib an max@vamp");
  await page.waitForTimeout(200);
  check("kein Popup bei max@vamp", (await page.locator("[data-mention-popup]").count()) === 0);
  await ctx.close();
}

// 6. Figuren: @ zeigt sie neben den Seiten, die Auswahl fügt eine Erwähnung ein
{
  const { ctx, page, ed, out, errors } = await fresh();
  await ed.pressSequentially("Mit @luc");
  const opt = page.locator('[data-mention-popup] [role="option"]');
  await opt.first().waitFor();
  const texts = await opt.allInnerTexts();
  check("Figur steht in der Liste", texts[0].includes("Lucian") && texts[0].includes("Figur") && !texts.some((t) => t.includes("Neue Seite") && t.includes("luc") === false), JSON.stringify(texts));
  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);
  const o = await out();
  check("Erwähnung als Knoten mit Kennung", /data-type="mention"/.test(o) && o.includes('data-id="11111111-1111-4111-8111-111111111111"') && o.includes("@Lucian"), o);
  await ed.pressSequentially("und @vamp");
  await page.locator('[data-mention-popup] [role="option"]').first().waitFor();
  await page.keyboard.press("Enter");
  check("Seite und Figur lassen sich mischen", (await out()).includes("[[Vampire]]") && (await out()).includes("@Lucian"), await out());
  check("keine Seitenfehler", errors.length === 0, errors.join("|"));
  await ctx.close();
}

// 7. Textbausteine: Tabelle, Hinweis-Kasten, Spoiler
{
  const { ctx, page, ed, out, errors } = await fresh();
  await ed.pressSequentially("Intro");
  await page.getByRole("button", { name: "Tabelle einfügen" }).click();
  let o = await out();
  check("Tabelle mit Kopfzeile, 3 Spalten", (o.match(/<th/g) ?? []).length === 3 && (o.match(/<td/g) ?? []).length === 6, o.slice(0, 160));
  await page.getByRole("button", { name: "Spalte rechts einfügen" }).click();
  o = await out();
  check("Spalte einfügen", (o.match(/<th/g) ?? []).length === 4);
  await page.getByRole("button", { name: "Zeile löschen" }).click();
  o = await out();
  // Der Cursor steht in der Kopfzeile: sie verschwindet, die zwei Datenzeilen (je 4 Zellen) bleiben.
  check("Zeile löschen", (o.match(/<th/g) ?? []).length === 0 && (o.match(/<td/g) ?? []).length === 8, `${(o.match(/<th/g) ?? []).length} th, ${(o.match(/<td/g) ?? []).length} td`);
  await page.getByRole("button", { name: "Tabelle löschen" }).click();
  o = await out();
  check("Tabelle löschen", !o.includes("<table"));

  await ed.click();
  await page.keyboard.press("Control+End");
  await page.getByRole("button", { name: "Hinweis-Kasten" }).click();
  await page.getByRole("menuitem", { name: "Achtung" }).click();
  o = await out();
  check("Hinweis-Kasten (Achtung)", o.includes('data-callout="achtung"') && o.includes("Intro"), o);
  await page.getByRole("button", { name: "Hinweis-Kasten" }).click();
  await page.getByRole("menuitem", { name: "Gefahr" }).click();
  check("Art lässt sich ändern", (await out()).includes('data-callout="gefahr"') && !(await out()).includes("achtung"));
  await page.getByRole("button", { name: "Hinweis-Kasten" }).click();
  await page.getByRole("menuitem", { name: "Kasten entfernen" }).click();
  check("Kasten entfernen", !(await out()).includes("data-callout"));

  await page.getByRole("button", { name: "Spoiler zum Aufklappen" }).click();
  await page.waitForTimeout(150); // der Cursor springt erst danach in den Titel
  await page.keyboard.type("Mehr lesen");
  o = await out();
  check("Spoiler mit Titel", /<details/.test(o) && /<summary/.test(o) && o.includes("Mehr lesen") && o.includes('data-type="detailsContent"'), o);
  check("keine Seitenfehler", errors.length === 0, errors.join("|"));
  await ctx.close();
}
// 8. Gespeicherte Bausteine laden sich wieder richtig in den Editor
{
  const html = '<div data-callout="tipp"><p>Merke dir das</p></div><details><summary>Titel</summary><div data-type="detailsContent"><p>Inhalt</p></div></details><table><tbody><tr><th><p>A</p></th><th><p>B</p></th></tr><tr><td><p>1</p></td><td><p>2</p></td></tr></tbody></table>';
  const ctx = await browser.newContext({ viewport: { width: 900, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url + "#" + encodeURIComponent(html));
  await page.locator(".ProseMirror").waitFor();
  await page.waitForTimeout(150);
  const out = await page.locator('input[name="content"]').inputValue();
  check("Hinweis, Spoiler und Tabelle bleiben beim Laden erhalten", out.includes('data-callout="tipp"') && out.includes("<summary") && out.includes('data-type="detailsContent"') && (out.match(/<th/g) ?? []).length === 2 && (out.match(/<td/g) ?? []).length === 2, out.slice(0, 200));
  // Spoiler im Editor aufklappen: der Inhalt wird sichtbar
  const content = page.locator('.ProseMirror [data-type="detailsContent"]');
  const hiddenBefore = !(await content.isVisible());
  await page.locator('.ProseMirror div[data-type="details"] > button').click();
  await page.waitForTimeout(100);
  check("Spoiler lässt sich im Editor auf- und zuklappen", hiddenBefore && (await content.isVisible()), String(hiddenBefore));
  await page.locator(".ProseMirror").screenshot({ path: path.join(here, ".build", "blocks.png") });
  check("keine Seitenfehler beim Laden", errors.length === 0, errors.join("|"));
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(failed ? `${failed} Test(e) fehlgeschlagen` : `Alle ${results.length} Prüfungen bestanden`);
process.exit(failed ? 1 : 0);
