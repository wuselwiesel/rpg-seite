// Charakterwechsel rund um Chats gegen die laufende App (schreibt nichts, wechselt nur den aktiven Charakter und stellt ihn am Ende wieder her):
//   1) Wechsel in der Chatliste, während ein Chat offen ist: man landet bei der Liste des neuen Charakters und springt nicht zurück.
//   2) Klick (Router-Navigation) auf einen Chat eines anderen eigenen Charakters, wie aus einer Benachrichtigung: Charakter wechselt, Chat lädt.
// Braucht ein Konto mit mindestens zwei eigenen Charakteren in einer Welt, wobei einer einen Chat hat, den der andere nicht hat.
//   E2E_BASE_URL      (Standard http://127.0.0.1:3000)
//   E2E_STORAGE_STATE Pfad zu einer Playwright-storageState-Datei (bereits angemeldet)
//   oder E2E_EMAIL + E2E_PASSWORD (Anmeldung über das Formular)
//   ohne beides: /dev-login (nur beim Entwicklungsserver mit E2E_USERNAME/E2E_PASSWORD in .env.local)
import { chromium } from "playwright-core";

const base = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const storageState = process.env.E2E_STORAGE_STATE;
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined, args: ["--no-sandbox"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...(storageState ? { storageState } : {}) });
const page = await context.newPage();
const results = [];
const check = (name, ok, extra = "") => {
  results.push(ok);
  console.log(ok ? "OK  " : "FAIL", name, extra);
};

const switchButton = () => page.locator('button[aria-label="Charakter wechseln"]:visible').first();
const activeName = async () => ((await switchButton().locator("h1").innerText()) ?? "").trim();
const chatHrefs = async () =>
  new Set(
    await page
      .locator('aside a[href^="/chats/"]')
      .evaluateAll((as) => as.map((a) => a.getAttribute("href")).filter((h) => /^\/chats\/[0-9a-f-]{36}$/.test(h ?? ""))),
  );

// Wählt in der Chatliste den Charakter mit diesem Namen und wartet, bis er oben steht
async function switchTo(name) {
  await switchButton().click();
  await page.locator('[role="menuitem"]', { hasText: name }).first().click();
  await page.waitForFunction((n) => document.querySelector('button[aria-label="Charakter wechseln"]:not([hidden]) h1')?.textContent?.trim() === n, name, { timeout: 15000 });
}

let original = null;
try {
  if (!storageState && email && password) {
    await page.goto(`${base}/login`);
    await page.locator('input[name="identifier"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15000 });
  } else if (!storageState) {
    const res = await page.goto(`${base}/dev-login?next=/chats`);
    if (!res || res.status() === 404 || res.status() === 500) {
      console.log("SKIP  Keine Anmeldung möglich: E2E_STORAGE_STATE, E2E_EMAIL + E2E_PASSWORD setzen oder den Entwicklungsserver nutzen.");
      await browser.close();
      process.exit(0);
    }
  }

  await page.goto(`${base}/chats`);
  await switchButton().waitFor({ timeout: 20000 }).catch(() => {});
  if (!(await switchButton().count())) {
    console.log("SKIP  Weniger als zwei eigene Charaktere in dieser Welt.");
    await browser.close();
    process.exit(0);
  }
  original = await activeName();
  await switchButton().click();
  const names = (await page.locator('[role="menuitem"]').allInnerTexts()).map((t) => t.split("\n")[0].trim());
  await page.keyboard.press("Escape");

  // Charakter A mit mindestens einem Chat, B mit einem Chat, den A nicht hat
  const lists = new Map();
  for (const n of names) {
    if (n !== (await activeName())) await switchTo(n);
    lists.set(n, await chatHrefs());
  }
  let pair = null;
  for (const a of names) {
    for (const b of names) {
      if (a === b) continue;
      const only = [...lists.get(b)].find((h) => !lists.get(a).has(h));
      if (only && lists.get(a).size > 0) pair = { a, b, href: only, aHref: [...lists.get(a)][0] };
    }
  }
  if (!pair) {
    console.log("SKIP  Kein Charakterpaar mit einem Chat, den nur einer von beiden hat.");
  } else {
    // 1) Chat offen, dann in der Chatliste zu einem Charakter wechseln, der nicht im Chat ist
    if ((await activeName()) !== pair.a) await switchTo(pair.a);
    await page.goto(base + pair.aHref);
    await switchButton().waitFor();
    await switchTo(pair.b);
    await page.waitForTimeout(500);
    const path1 = new URL(page.url()).pathname;
    await page.waitForTimeout(4000);
    check("Wechsel bei offenem Chat: man landet bei der Chatliste", path1 === "/chats", path1);
    check("Wechsel bei offenem Chat: der neue Charakter bleibt aktiv (kein Zurückspringen)", (await activeName()) === pair.b && new URL(page.url()).pathname === "/chats", await activeName());

    // 2) Router-Navigation zu einem Chat des anderen Charakters
    await switchTo(pair.a);
    await page.evaluate((h) => window.next.router.push(h), pair.href);
    await page.waitForFunction(() => !!document.querySelector('form textarea, form [contenteditable="true"], input[placeholder^="Schreib"]'), null, { timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const openChat = await page.locator('input[placeholder^="Schreib"], textarea[placeholder^="Schreib"], [contenteditable="true"]').count();
    check("Klick auf Chat eines anderen Charakters: Chat lädt (Eingabefeld sichtbar)", openChat > 0 && new URL(page.url()).pathname === pair.href);
    check("Klick auf Chat eines anderen Charakters: Charakter wechselt mit", (await activeName()) === pair.b, await activeName());
  }
} catch (e) {
  results.push(false);
  console.log("FAIL", "Ablauf abgebrochen:", String(e).slice(0, 300));
} finally {
  try {
    await page.goto(`${base}/chats`);
    if (original && (await switchButton().count()) && (await activeName()) !== original) await switchTo(original);
  } catch {
    console.log(`Hinweis: aktiven Charakter bitte von Hand auf „${original}“ zurückstellen.`);
  }
  await browser.close();
}

const failed = results.filter((r) => !r).length;
console.log(failed === 0 ? `\nAlles bestanden (${results.length}).` : `\n${failed} von ${results.length} fehlgeschlagen.`);
process.exit(failed === 0 ? 0 : 1);
