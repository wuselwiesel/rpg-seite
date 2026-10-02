// Wiki-Formular im echten Browser: Typ wählen bereitet Steckbrief und Gliederung vor, ohne Geschriebenes zu überschreiben.
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
  const ctx = await browser.newContext({ viewport: { width: 900, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator(".ProseMirror").waitFor();
  return { ctx, page, errors, type: () => page.locator('input[name="page_type"]').inputValue(), body: () => page.locator('input[name="content"]').inputValue() };
}
const fieldTitles = (page) => page.locator('input[name$="title"], input[placeholder*="Titel"]').evaluateAll((els) => els.map((e) => e.value));

// 1. Typ Ereignis auf leerer Seite: Gliederung und Felder
{
  const { ctx, page, errors, type, body } = await fresh();
  await page.getByRole("radio", { name: "Ereignis" }).click();
  await page.waitForTimeout(200);
  check("Typ wird gesetzt", (await type()) === "ereignis");
  const html = await page.locator(".ProseMirror").innerHTML();
  check("Gliederung steht im Editor", html.includes("Was geschah?") && html.includes("Folgen"), html.slice(0, 120));
  const text = await page.locator("form").innerText();
  check("Steckbrief hat die Felder des Typs", ["Datum", "Beteiligte"].every((t) => text.length > 0) && (await page.locator('input[value="Beteiligte"]').count()) === 1);
  check("keine Seitenfehler", errors.length === 0, errors.join("|"));
  await ctx.close();
}
// 2. Geschriebener Text bleibt beim Typwechsel
{
  const { ctx, page, body } = await fresh();
  await page.locator(".ProseMirror").click();
  await page.keyboard.type("Mein eigener Text");
  await page.getByRole("radio", { name: "Ort" }).click();
  await page.waitForTimeout(200);
  const b = await body();
  check("Eigener Text bleibt, keine Gliederung darüber", b.includes("Mein eigener Text") && !b.includes("Geschichte"), b);
  check("Felder des Typs kommen trotzdem", (await page.locator('input[value="Lage"]').count()) === 1);
  // Felder mit Inhalt bleiben beim nächsten Wechsel
  await page.locator('input[value="Lage"]').locator("xpath=following::*[self::input or self::textarea][1]").fill("Am Meer");
  await page.getByRole("radio", { name: "Spezies / Wesen" }).click();
  await page.waitForTimeout(200);
  check("Ausgefüllter Steckbrief wird nicht ersetzt", (await page.locator('input[value="Lage"]').count()) === 1 && (await page.locator('input[value="Schwäche"]').count()) === 0);
  await ctx.close();
}
// 3. „Keine“ nimmt den Typ zurück
{
  const { ctx, page, type } = await fresh();
  await page.getByRole("radio", { name: "Mythos" }).click();
  await page.getByRole("radio", { name: "Keine" }).click();
  check("Typ lässt sich zurücknehmen", (await type()) === "");
  await ctx.close();
}

// 4. Tags und Entwurf-Schalter
{
  const { ctx, page } = await fresh();
  await page.locator('input[name="tags"]').fill("Magie, Küste");
  check("Tags-Feld nimmt Text an", (await page.locator('input[name="tags"]').inputValue()) === "Magie, Küste");
  const draft = page.locator('input[name="is_draft"]');
  check("Entwurf-Schalter ist anfangs aus", (await draft.count()) === 1 && !(await draft.isChecked()));
  await draft.check();
  check("Entwurf-Schalter lässt sich setzen", await draft.isChecked());
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(failed ? `${failed} Test(e) fehlgeschlagen` : `Alle ${results.length} Prüfungen bestanden`);
process.exit(failed ? 1 : 0);
