// ChaBo im Bearbeiten: Attribute und Talente würfeln, Stil, Rückgängig, Rassen-Boni, Layout am Handy.
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

async function fresh(query = "?gefuellt=1", opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url + query);
  await page.getByRole("button", { name: "Bearbeiten" }).first().click();
  const attrs = () =>
    page.locator('section[aria-label="Attribute"] input[aria-invalid]').evaluateAll((els) => els.filter((e) => e.closest("label")?.textContent?.startsWith("Basis")).map((e) => e.value));
  const bonuses = () => page.locator('section[aria-label="Talente"] input[aria-label^="Bonus "]').evaluateAll((els) => els.map((e) => e.value));
  return { ctx, page, errors, attrs, bonuses };
}
const sum = (xs) => xs.reduce((s, x) => s + (Number(x) || 0), 0);

// 1. Attribute würfeln: Budget, Bereich, Glück
{
  const { ctx, page, errors, attrs } = await fresh();
  const before = await attrs();
  check("Ausgangswerte stehen drin", before.join() === "12,11,9,8,10,7,6,9,8,10", before.join());
  check("Rückgängig anfangs gesperrt", await page.getByRole("button", { name: "Attribute rückgängig" }).isDisabled());
  check("Stil „Ausgewogen“ ist vorgewählt", (await page.getByRole("radio", { name: "Ausgewogen" }).getAttribute("aria-checked")) === "true");
  let ok = true;
  const seenLuck = new Set();
  for (let i = 0; i < 25; i++) {
    await page.getByRole("button", { name: "Attribute würfeln" }).click();
    const v = (await attrs()).map(Number);
    const gl = v[9];
    seenLuck.add(gl);
    if (v.length !== 10 || sum(v) !== 90 || v.some((x) => x < 1 || x > 19) || ![1, 5, 10, 15].includes(gl)) ok = false;
  }
  check("25 Würfe: immer 90 Punkte, 1–19, Glück 1/5/10/15", ok, [...seenLuck].join());
  check("Zähler zeigt 90 / 90", (await page.locator('[aria-label="Attributpunkte"]').innerText()).includes("90 / 90"));
  check("keine ungültigen Felder", (await page.locator('section[aria-label="Attribute"] [aria-invalid="true"]').count()) === 0);
  check("keine Seitenfehler", errors.length === 0, errors.join("|"));
  await ctx.close();
}
// 2. Stil Wild und Speichern
{
  const { ctx, page, attrs } = await fresh();
  await page.getByRole("radio", { name: "Wild" }).click();
  check("Wild ist gewählt", (await page.getByRole("radio", { name: "Wild" }).getAttribute("aria-checked")) === "true" && (await page.getByRole("radio", { name: "Ausgewogen" }).getAttribute("aria-checked")) === "false");
  await page.getByRole("button", { name: "Attribute würfeln" }).click();
  const v = (await attrs()).map(Number);
  check("Wild: 90 Punkte", sum(v) === 90, v.join());
  await page.waitForTimeout(1300);
  const saves = await page.evaluate(() => window.__saves);
  const last = saves[saves.length - 1];
  check("gewürfelte Werte werden automatisch gespeichert", last && sum(Object.values(last.attrBasis)) === 90 && last.attrBasis.MU === String(v[0]), JSON.stringify(last?.attrBasis));
  await ctx.close();
}
// 3. Rückgängig: stellt den Stand davor wieder her, schrittweise; berührt Talente nicht
{
  const { ctx, page, attrs, bonuses } = await fresh();
  const start = (await attrs()).join();
  const bonusStart = (await bonuses()).join();
  await page.getByRole("button", { name: "Attribute würfeln" }).click();
  const first = (await attrs()).join();
  await page.getByRole("button", { name: "Attribute würfeln" }).click();
  check("Rückgängig ist nach dem Würfeln frei", !(await page.getByRole("button", { name: "Attribute rückgängig" }).isDisabled()));
  await page.getByRole("button", { name: "Attribute rückgängig" }).click();
  check("ein Schritt zurück: Stand nach dem ersten Wurf", (await attrs()).join() === first);
  await page.getByRole("button", { name: "Attribute rückgängig" }).click();
  check("zweiter Schritt: Ausgangswerte", (await attrs()).join() === start, start);
  check("danach wieder gesperrt", await page.getByRole("button", { name: "Attribute rückgängig" }).isDisabled());
  check("Talente blieben unberührt", (await bonuses()).join() === bonusStart);
  await ctx.close();
}
// 4. Talente: Budget 20, keine negativen, Obergrenze
{
  const { ctx, page, errors, bonuses } = await fresh();
  let ok = true;
  let nonEmpty = [];
  for (let i = 0; i < 20; i++) {
    await page.getByRole("button", { name: "Talente würfeln" }).click();
    const b = (await bonuses()).map((x) => Number(x) || 0);
    nonEmpty.push(b.filter((x) => x > 0).length);
    if (sum(b) !== 20 || b.some((x) => x < 0 || x > 19)) ok = false;
  }
  check("20 Würfe (Allrounder:in): immer genau 20 Punkte, keine negativen", ok);
  check("Allrounder:in: viele Talente mit kleinen Boni", nonEmpty.every((n) => n >= 7 && n <= 16), nonEmpty.join());
  check("Zähler zeigt 20 / 20", (await page.locator('[aria-label="Talentpunkte"]').innerText()).includes("20 / 20"));
  check("Gesamtwerte höchstens 19, keine Deckelung (*)", (await page.locator('section[aria-label="Talente"] li span:has-text("*")').count()) === 0);
  await page.getByRole("radio", { name: "Spezialist:in" }).click();
  nonEmpty = [];
  ok = true;
  for (let i = 0; i < 20; i++) {
    await page.getByRole("button", { name: "Talente würfeln" }).click();
    const b = (await bonuses()).map((x) => Number(x) || 0);
    nonEmpty.push(b.filter((x) => x > 0).length);
    if (sum(b) !== 20) ok = false;
  }
  check("Spezialist:in: 20 Punkte auf wenige Talente", ok && nonEmpty.every((n) => n >= 3 && n <= 8), nonEmpty.join());
  check("keine Seitenfehler", errors.length === 0, errors.join("|"));
  await ctx.close();
}
// 5. Talente: Rückgängig stellt die alten Boni wieder her
{
  const { ctx, page, bonuses } = await fresh();
  const start = (await bonuses()).join();
  await page.getByRole("button", { name: "Talente würfeln" }).click();
  check("Würfeln ersetzt die Talent-Boni", (await bonuses()).join() !== start);
  await page.getByRole("button", { name: "Talente rückgängig" }).click();
  check("Rückgängig bringt Klettern 5 und Singen 7 zurück", (await bonuses()).join() === start);
  await ctx.close();
}
// 6. Rassen-Boni bleiben
{
  const { ctx, page } = await fresh("?gefuellt=1&vampir=1");
  const ge = () => page.locator('section[aria-label="Attribute"] li:has(span:text-is("GE"))').locator('input[min="-19"]').inputValue();
  const before = await ge();
  await page.getByRole("button", { name: "Attribute würfeln" }).click();
  await page.getByRole("button", { name: "Talente würfeln" }).click();
  check("Vampir-Bonus auf Geschicklichkeit (+5) bleibt unangetastet", before === "5" && (await ge()) === "5", `${before} -> ${await ge()}`);
  await ctx.close();
}
// 7. Nur im Bearbeiten
{
  const { ctx, page } = await fresh();
  check("im Bearbeiten sichtbar", (await page.getByRole("button", { name: "Attribute würfeln" }).count()) === 1 && (await page.getByRole("button", { name: "Talente würfeln" }).count()) === 1);
  await page.getByRole("button", { name: "Fertig" }).click();
  check("in der Ansicht nicht vorhanden", (await page.getByRole("button", { name: "Attribute würfeln" }).count()) === 0 && (await page.getByRole("radio", { name: "Wild" }).count()) === 0);
  await ctx.close();
}
// 8. Persönliche Angaben: Alles zufällig, Würfel je Zeile, Rückgängig, Wesen
{
  const { ctx, page, errors } = await fresh();
  const rows = () =>
    page.locator('input[aria-label="Bezeichnung"]').evaluateAll((labels) =>
      labels.map((l) => {
        const grid = l.parentElement;
        const value = grid.querySelector('input[role="combobox"]');
        return { label: l.value, value: value ? value.value : null, dice: Boolean(grid.querySelector('button[aria-label$="würfeln"]')) };
      }),
    );
  const start = await rows();
  check("Standardzeilen: Würfel nur bei erkannten Bezeichnungen", start.filter((r) => r.dice).map((r) => r.label).join() === "Vorname,Nachname,Spitzname,Alter,Wesen", JSON.stringify(start.map((r) => [r.label, r.dice])));
  check("Rückgängig bei den Angaben anfangs gesperrt", await page.getByRole("button", { name: "Angaben rückgängig" }).isDisabled());
  await page.getByRole("button", { name: "Alles zufällig würfeln" }).click();
  const all = await rows();
  const by = (l) => all.find((r) => r.label === l);
  check("Vorname „Lyra“ bleibt, leere Felder sind gefüllt", by("Vorname").value === "Lyra" && ["Nachname", "Spitzname", "Alter", "Wesen"].every((l) => by(l).value?.trim()), JSON.stringify(all.map((r) => [r.label, r.value])));
  check("Fehlende Felder wurden angelegt (Hobbys, Beruf, Eigenheiten, Aussehen)", ["Hobbys", "Beruf / Schule / AG", "Eigenheiten", "Aussehen"].every((l) => by(l)?.value?.trim() && by(l).dice));
  check("Titel und Rang bleiben leer, ohne Würfel", by("Titel").value === "" && !by("Titel").dice && by("Rang").value === "" && !by("Rang").dice);
  const race = await page.locator("select").first().inputValue();
  const wesen = by("Wesen").value;
  check("Besondere Natur passt zum Wesen", ({ Mensch: "none", Werwolf: "werwolf", Vampir: "vampir" })[wesen] === race, `${wesen} / ${race}`);
  await page.getByRole("button", { name: "Alles zufällig würfeln" }).click();
  const again = await rows();
  check("zweites „Alles zufällig“ ändert nichts mehr", JSON.stringify(again) === JSON.stringify(all));
  await page.waitForTimeout(1300);
  const saves = await page.evaluate(() => window.__saves);
  const last = saves[saves.length - 1];
  check("Angaben werden automatisch gespeichert", last && last.personalFields.some((f) => f.label === "Hobbys" && f.value) && last.personalFields.find((f) => f.label === "Vorname").value === "Lyra");
  await page.getByRole("button", { name: "Angaben rückgängig" }).click();
  check("Rückgängig stellt die Angaben vor „Alles zufällig“ wieder her (Zeilen, Werte)", JSON.stringify(await rows()) === JSON.stringify(start), JSON.stringify(await rows()));
  check("…und die Besondere Natur samt Boni", (await page.locator("select").first().inputValue()) === "none" && (await page.locator('section[aria-label="Attribute"] li:has(span:text-is("GE"))').locator('input[min="-19"]').inputValue()) === "");
  await ctx.close();
  check("keine Seitenfehler", errors.length === 0, errors.join("|"));
}
{
  const { ctx, page } = await fresh();
  const spitz = page.locator('input[role="combobox"][aria-label="Spitzname"]');
  const before = await spitz.inputValue();
  check("Spitzname ist anfangs leer", before === "");
  await page.getByRole("button", { name: "Spitzname würfeln" }).click();
  const rolled = await spitz.inputValue();
  check("Würfel in der Zeile füllt den Wert", rolled.trim().length > 0);
  await page.getByRole("button", { name: "Angaben rückgängig" }).click();
  check("Rückgängig leert ihn wieder", (await spitz.inputValue()) === "");
  check("Rückgängig danach wieder gesperrt", await page.getByRole("button", { name: "Angaben rückgängig" }).isDisabled());
  // Wesen-Würfel mehrmals: Natur und Wesen bleiben im Gleichschritt, Boni passen
  let ok = true;
  const seen = new Set();
  for (let i = 0; i < 200 && (i < 30 || seen.size < 3); i++) {
    await page.getByRole("button", { name: "Wesen würfeln" }).click();
    const w = await page.locator('input[role="combobox"][aria-label="Wesen"]').inputValue();
    seen.add(w);
    const r = await page.locator("select").first().inputValue();
    const ge = await page.locator('section[aria-label="Attribute"] li:has(span:text-is("GE"))').locator('input[min="-19"]').inputValue();
    const want = ({ Mensch: ["none", ""], Werwolf: ["werwolf", "5"], Vampir: ["vampir", "5"] })[w];
    if (!want || r !== want[0] || ge !== want[1]) ok = false;
  }
  check("Wesen-Würfel: Besondere Natur und Boni stimmen jedes Mal", ok, [...seen].join());
  check("alle drei Wesen kamen vor", seen.size === 3);
  await ctx.close();
}
// 9. Talente: Attribute nur beim Darüberfahren, Fokus oder Tippen; Kacheln oben werden hervorgehoben
{
  const { ctx, page, errors } = await fresh();
  await page.getByRole("button", { name: "Fertig" }).click();
  const row = (slug) => page.locator(`[data-talent="talent_${slug}"]`);
  const attrName = (code) => page.locator(`[data-attr="${code}"] p`).first().innerText();
  const lit = () => page.locator("[data-attr][data-highlight]").evaluateAll((els) => els.map((e) => e.getAttribute("data-attr")).sort().join());
  check("Ohne Darüberfahren steht keine Attribut-Zeile bei den Talenten", (await page.getByRole("tooltip").count()) === 0 && (await page.locator('section[aria-label="Talente"]').innerText()).includes(await attrName("KK")) === false);
  check("keine Kachel hervorgehoben", (await lit()) === "");
  await row("klettern").hover();
  const tip = page.getByRole("tooltip");
  await tip.waitFor();
  const text = await tip.innerText();
  check("Hover zeigt beide Attribute mit Wert und die Basis", text.includes(await attrName("GE")) && text.includes(await attrName("KK")) && /Ø \d+/.test(text), text.replace(/\n/g, " "));
  check("Die zwei Attribut-Kacheln oben sind hervorgehoben (GE, KK)", (await lit()) === "GE,KK", await lit());
  await row("singen").hover();
  await page.waitForTimeout(80);
  check("Wechsel zu „Singen“ zeigt dessen Attribute (CH, KO)", (await page.getByRole("tooltip").count()) === 1 && (await lit()) === "CH,KO", await lit());
  await page.mouse.move(2, 2);
  await page.waitForTimeout(80);
  check("Maus weg: Karte und Hervorhebung verschwinden", (await page.getByRole("tooltip").count()) === 0 && (await lit()) === "");
  // Tastatur
  await row("tanzen").focus();
  check("Fokus (Tastatur) zeigt die Attribute", (await page.getByRole("tooltip").count()) === 1 && (await lit()) === "GE,KO", await lit());
  await page.keyboard.press("Escape");
  check("Escape schließt", (await page.getByRole("tooltip").count()) === 0);
  check("keine Seitenfehler", errors.length === 0, errors.join("|"));
  await ctx.close();
}
{
  // Handy: Tippen zeigt, erneutes Tippen verbirgt, anderes Talent wechselt
  const { ctx, page } = await fresh("?gefuellt=1", { hasTouch: true, isMobile: true, viewport: { width: 375, height: 800 } });
  await page.getByRole("button", { name: "Fertig" }).click();
  const row = (slug) => page.locator(`[data-talent="talent_${slug}"]`);
  await row("klettern").scrollIntoViewIfNeeded();
  await row("klettern").tap({ position: { x: 20, y: 12 } });
  check("Tippen zeigt die Attribute", (await page.getByRole("tooltip").count()) === 1);
  const box = await page.getByRole("tooltip").boundingBox();
  check("Karte liegt am Handy im Bild", box && box.x >= 0 && box.x + box.width <= 376, JSON.stringify(box));
  await row("klettern").tap({ position: { x: 20, y: 12 } });
  check("Erneutes Tippen verbirgt sie", (await page.getByRole("tooltip").count()) === 0);
  await row("klettern").tap({ position: { x: 20, y: 12 } });
  await row("schwimmen").tap({ position: { x: 20, y: 12 } });
  check("Anderes Talent wechselt die Karte", (await page.getByRole("tooltip").count()) === 1 && (await page.locator("[data-attr][data-highlight]").evaluateAll((e) => e.map((x) => x.getAttribute("data-attr")).sort().join())) === "KK,KO");
  await ctx.close();
}
{
  // Im Bearbeiten: Fokus im Bonusfeld zeigt die Attribute, Tippen ins Feld schaltet nichts um
  const { ctx, page } = await fresh();
  await page.locator('input[aria-label="Bonus Klettern"]').click();
  check("Im Bearbeiten: Fokus im Bonusfeld zeigt die Attribute", (await page.getByRole("tooltip").count()) === 1);
  await page.locator('input[aria-label="Bonus Klettern"]').fill("6");
  check("Eingabe funktioniert weiter", (await page.locator('input[aria-label="Bonus Klettern"]').inputValue()) === "6");
  await ctx.close();
}
// 10. Layout: Desktop, Tablet, Handy ohne Überlauf und Überlappung
for (const [w, h] of [[1280, 800], [768, 900], [375, 800]]) {
  const { ctx, page } = await fresh("?gefuellt=1", { viewport: { width: w, height: h } });
  await page.getByRole("button", { name: "Alles zufällig würfeln" }).click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const rowsOk = await page.evaluate(() => {
    // Würfel liegt im Eingabefeld und überlappt weder Schloss noch Entfernen-Knopf
    return [...document.querySelectorAll('button[aria-label$=" würfeln"]')].filter((b) => b.closest(".relative")).every((b) => {
      const r = b.getBoundingClientRect();
      const grid = b.closest(".grid");
      if (!grid) return true;
      const input = grid.querySelector('input[role="combobox"]').getBoundingClientRect();
      const others = [...grid.querySelectorAll('button[aria-label="Geheim halten"], button[aria-label="Zeile entfernen"]')].map((o) => o.getBoundingClientRect());
      const inside = r.left >= input.left - 1 && r.right <= input.right + 1;
      const clash = others.some((o) => r.left < o.right - 1 && o.left < r.right - 1 && r.top < o.bottom - 1 && o.top < r.bottom - 1);
      return inside && !clash;
    });
  });
  check(`${w} px: Würfel in den Zeilen liegen im Feld, ohne Überlappung`, rowsOk);
  check(`${w} px: kein seitliches Scrollen`, overflow <= 0, String(overflow));
  const boxes = await page.evaluate(() => {
    const out = {};
    for (const label of ["Attribute", "Talente"]) {
      const g = document.querySelector(`[role="group"][aria-label="${label}"]`);
      out[label] = [...g.querySelectorAll("button")].map((b) => { const r = b.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; });
    }
    return out;
  });
  const overlap = (a, b) => a[0] < b[2] - 1 && b[0] < a[2] - 1 && a[1] < b[3] - 1 && b[1] < a[3] - 1;
  let clash = false;
  for (const list of Object.values(boxes)) for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if (overlap(list[i], list[j])) clash = true;
  check(`${w} px: Knöpfe überlappen nicht`, !clash);
  const inView = Object.values(boxes).flat().every((b) => b[0] >= -1 && b[2] <= w + 1);
  check(`${w} px: Knöpfe liegen im Bild`, inView);
  if (w === 375) await page.screenshot({ path: path.join(here, ".build", "handy.png"), fullPage: false });
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(failed ? `${failed} Test(e) fehlgeschlagen` : `Alle ${results.length} Prüfungen bestanden`);
process.exit(failed ? 1 : 0);
