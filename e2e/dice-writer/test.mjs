// Würfeln in der Szene nutzt immer den Charakterbogen des gewählten Charakters: Wertliste, übernommener Wert und das Formular nach einem Wechsel.
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

const ctx = await browser.newContext({ viewport: { width: 900, height: 900 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(url);
await page.getByRole("button", { name: /Würfeln/ }).first().click();
const select = page.locator("select").filter({ hasText: "Aus Charakterbogen wählen" });
await select.waitFor();

// Ayla: Mut 15
check("Ayla: Mut (15) steht zur Auswahl", (await select.locator("option").allTextContents()).some((t) => t.trim() === "Mut (15)"));
await select.selectOption({ label: "Mut (15)" });
check("Ayla: Wert 15 wird übernommen", (await page.locator('input[name="value"]').inputValue()) === "15");
await page.locator('input[name="label"]').fill("Mutprobe");

// Wechsel zu Ben mit Alt+. : das Formular beginnt neu, nichts von Ayla bleibt stehen
await page.keyboard.press("Alt+Period");
await page.waitForTimeout(250);
const sel2 = page.locator("select").filter({ hasText: "Aus Charakterbogen wählen" });
await sel2.waitFor();
check("Ben: Formular ist leer (Wert, Bezeichnung, Stat)", (await page.locator('input[name="value"]').inputValue()) === "" && (await page.locator('input[name="label"]').inputValue()) === "" && (await page.locator('input[name="stat_name"]').count()) === 0);
check("Ben: Werteliste ist Bens Bogen (Mut 10)", (await sel2.locator("option").allTextContents()).some((t) => t.trim() === "Mut (10)") && !(await sel2.locator("option").allTextContents()).some((t) => t.trim() === "Mut (15)"));
check("Würfel-Formular schickt Bens Charakter-Id", (await page.locator('input[name="character_id"]').inputValue()) === "b");
await sel2.selectOption({ label: "Mut (10)" });
await page.getByRole("button", { name: /Würfeln$|Würfel werfen|Wurf/ }).last().click().catch(() => {});
await page.locator('form button[type="submit"]').first().click();
await page.waitForTimeout(250);
const roll = await page.evaluate(() => window.__rolls.at(-1));
check("Wurf: Charakter Ben, Wert 10, Stat Mut", roll?.character_id === "b" && roll.value === "10" && roll.stat_name === "Mut", JSON.stringify(roll));

// Von Hand geänderter Wert löst die Bindung an den Bogen
await page.keyboard.press("Alt+Comma");
await page.waitForTimeout(250);
const sel3 = page.locator("select").filter({ hasText: "Aus Charakterbogen wählen" });
await sel3.selectOption({ label: "Mut (15)" });
await page.locator('input[name="value"]').fill("12");
check("Eigener Wert: Bindung an den Stat entfällt", (await page.locator('input[name="stat_name"]').count()) === 0);

// Ja/Nein-Wurf: Umschalter im Reiter, Frage, Geheim, Antwort; der normale Wurf bleibt unverändert
await page.keyboard.press("Alt+Period");
await page.waitForTimeout(250);
const toggle = page.getByRole("radiogroup", { name: "Art des Wurfs" });
check("Umschalter Würfel / Ja / Nein ist da", (await toggle.getByRole("radio").allTextContents()).join("|") === "Würfel|Ja / Nein");
check("Standard ist der Würfelwurf", (await page.locator('input[name="label"]').count()) === 1 && (await page.getByText("Frage", { exact: true }).count()) === 0);
await toggle.getByRole("radio", { name: "Ja / Nein" }).click();
check("Ja/Nein: Feld „Frage“, Geheim und Würfeln, keine Zahlenfelder", (await page.getByText("Frage", { exact: true }).count()) === 1 && (await page.locator('input[name="secret"]').count()) === 1 && (await page.locator('input[name="value"]').count()) === 0 && (await page.locator('input[name="die"], select[name="die"]').count()) === 0);
await page.locator('input[name="label"]').fill("Folgt uns jemand?");
await page.locator('form button[type="submit"]').first().click();
await page.waitForTimeout(250);
let yn = await page.evaluate(() => window.__yesno.at(-1));
check("Ja/Nein offen: Frage und Figur gesendet, nicht geheim", yn?.label === "Folgt uns jemand?" && yn.character_id === "b" && yn.secret === undefined, JSON.stringify(yn));
check("Ja/Nein: Antwort „Ja“ erscheint, Feld wird geleert", (await page.getByText("Ja", { exact: true }).count()) >= 1 && (await page.locator('input[name="label"]').inputValue()) === "");
await page.locator('input[name="label"]').fill("Ist die Tür verschlossen?");
await page.locator('input[name="secret"]').check();
await page.locator('form button[type="submit"]').first().click();
await page.waitForTimeout(250);
yn = await page.evaluate(() => window.__yesno.at(-1));
check("Ja/Nein geheim: secret=on gesendet", yn?.label === "Ist die Tür verschlossen?" && yn.secret === "on", JSON.stringify(yn));
check("Ja/Nein: ohne Frage kein Absenden", await page.locator('input[name="label"]').evaluate((el) => el.required));
await toggle.getByRole("radio", { name: "Würfel" }).click();
check("Zurück zum Würfelwurf: Zahlenfelder wieder da", (await page.locator('input[name="value"]').count()) === 1);

check("keine Seitenfehler", errors.length === 0, errors.join("|"));
await ctx.close();
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(failed ? `${failed} Prüfung(en) fehlgeschlagen` : `Alle ${results.length} Prüfungen bestanden`);
process.exit(failed ? 1 : 0);
