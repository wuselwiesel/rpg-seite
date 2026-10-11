// Wichtige Abläufe gegen die laufende App: Anmelden, Senden, Bündeln, Fehlschlag beim Senden, Zoom-Sperre.
// Braucht ein Konto, das in einer Szene schreiben darf. Nichts davon wird eingecheckt:
//   E2E_BASE_URL      (Standard http://127.0.0.1:3000)
//   E2E_SCENE         Pfad der Szene, z. B. /story/<id> (Konto muss dort schreiben dürfen; mindestens zwei eigene Figuren für „Bündeln“)
//   E2E_STORAGE_STATE Pfad zu einer Playwright-storageState-Datei (bereits angemeldet)
//   oder E2E_EMAIL + E2E_PASSWORD (Anmeldung über das Formular)
// Alle Testnachrichten beginnen mit „E2E-“ und werden am Ende wieder gelöscht.
import { chromium } from "playwright-core";

const base = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const scene = process.env.E2E_SCENE;
const storageState = process.env.E2E_STORAGE_STATE;
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

if (!scene || (!storageState && !(email && password))) {
  console.log("SKIP  E2E_SCENE und E2E_STORAGE_STATE (oder E2E_EMAIL + E2E_PASSWORD) setzen, um die Abläufe zu prüfen.");
  process.exit(0);
}

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined, args: ["--no-sandbox"] });
const context = await browser.newContext({ viewport: { width: 1200, height: 900 }, ...(storageState ? { storageState } : {}) });
const page = await context.newPage();
const results = [];
const check = (name, ok, extra = "") => {
  results.push(ok);
  console.log(ok ? "OK  " : "FAIL", name, extra);
};
const tag = `E2E-${Date.now()}`;
const editor = () => page.locator("form .ProseMirror").first();

async function removeTestMessages() {
  // Alle Beiträge mit unserer Kennung über die Oberfläche löschen
  page.once("dialog", (d) => d.accept());
  for (let i = 0; i < 8; i++) {
    const card = page.locator('[id^="beitrag-"]', { hasText: tag }).first();
    if (!(await card.count())) break;
    await card.hover();
    page.once("dialog", (d) => d.accept());
    await card.locator('button[title="Löschen"], button[aria-label="Löschen"]').first().click();
    await page.waitForTimeout(1200);
    await page.reload();
    await page.waitForTimeout(800);
  }
}

try {
  if (!storageState) {
    await page.goto(`${base}/login`);
    await page.locator('input[name="identifier"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15000 });
    check("Anmelden: weiter zur App", true);
  }

  await page.goto(base + scene);
  await editor().waitFor({ timeout: 20000 });

  // Zoom-Sperre
  const viewport = await page.evaluate(() => document.querySelector('meta[name="viewport"]')?.content ?? "");
  check("Kein Zoomen: Viewport sperrt die Skalierung", /maximum-scale=1/.test(viewport) && /user-scalable=no/.test(viewport), viewport);

  // 1) Normal senden: Feld wird leer, Nachricht erscheint, nach dem Neuladen bleibt es leer
  await editor().click();
  await page.keyboard.type(`${tag} normal`);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  check("Senden: Schreibfeld sofort leer", (await editor().innerText()).trim() === "");
  await page.locator('[id^="beitrag-"]', { hasText: `${tag} normal` }).first().waitFor({ timeout: 10000 }).catch(() => {});
  check("Senden: Nachricht erscheint in der Szene", (await page.locator('[id^="beitrag-"]', { hasText: `${tag} normal` }).count()) > 0);
  await page.reload();
  await editor().waitFor();
  await page.waitForTimeout(800);
  check("Senden: nach dem Neuladen kehrt der Text nicht zurück", (await editor().innerText()).trim() === "");

  // 2) Bündeln: Text wandert in den ersten Abschnitt, gesendet wird eine Nachricht mit zwei Abschnitten
  const bundleButton = page.getByRole("button", { name: "Bündeln" });
  if (await bundleButton.count()) {
    await editor().click();
    await page.keyboard.type(`${tag} eins`);
    await bundleButton.click();
    await page.waitForTimeout(500);
    const editors = page.locator("form .ProseMirror");
    check("Bündeln: geschriebener Text ist im ersten Abschnitt", (await editors.nth(0).innerText()).includes(`${tag} eins`));
    await editors.nth(1).click();
    await page.keyboard.type(`${tag} zwei`);
    await page.getByRole("button", { name: "Weiterschreiben" }).click();
    await page.waitForTimeout(300);
    const emptied = (await page.locator("form .ProseMirror").allInnerTexts()).every((t) => t.trim() === "");
    check("Bündeln: Abschnitte sofort leer nach dem Senden", emptied);
    const bundled = page.locator('[id^="beitrag-"]', { hasText: `${tag} eins` }).first();
    await bundled.waitFor({ timeout: 10000 }).catch(() => {});
    check("Bündeln: Nachricht zeigt beide Abschnitte", (await page.locator("body").innerText()).includes(`${tag} zwei`));
    // Bündeln wieder aus: der gerade gesendete Text taucht nicht im Feld auf
    await page.getByRole("button", { name: "Bündeln" }).click().catch(() => {});
    await page.waitForTimeout(400);
    const afterToggle = (await page.locator("form .ProseMirror").allInnerTexts()).join("");
    check("Bündeln: gesendeter Text taucht nicht wieder auf", !afterToggle.includes(tag));
  } else {
    console.log("SKIP  Bündeln (weniger als zwei eigene Figuren)");
  }

  // 3) Senden schlägt fehl (offline): Text bleibt erhalten, Meldung erscheint
  await page.reload();
  await editor().waitFor();
  await editor().click();
  await page.keyboard.type(`${tag} offline`);
  await context.setOffline(true);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(2500);
  const kept = (await editor().innerText()).includes(`${tag} offline`);
  check("Fehlschlag: Text bleibt im Schreibfeld erhalten", kept);
  await context.setOffline(false);
} catch (e) {
  results.push(false);
  console.log("FAIL", "Ablauf abgebrochen:", String(e).slice(0, 300));
} finally {
  try {
    await context.setOffline(false);
    await page.goto(base + scene);
    await removeTestMessages();
  } catch {
    console.log("Hinweis: Testnachrichten bitte per Hand löschen (Kennung E2E-).");
  }
  await browser.close();
}

const failed = results.filter((r) => !r).length;
console.log(failed === 0 ? `\nAlles bestanden (${results.length}).` : `\n${failed} von ${results.length} fehlgeschlagen.`);
process.exit(failed === 0 ? 0 : 1);
