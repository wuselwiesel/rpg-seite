// Online-Status: grüner Punkt, Emoji statt Punkt, Text, offline = nichts; Einstellungen im Redaktionsprofil.
import { chromium } from "playwright-core";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./build.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined, args: ["--no-sandbox"] });
const results = [];
const check = (name, ok, extra = "") => { results.push(ok); console.log(ok ? "OK  " : "FAIL", name, extra); };
const errors = [];

for (const [w, h, label] of [[1280, 800, "Laptop"], [375, 740, "Handy"]]) {
  const page = await (await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 500, isMobile: w < 500 })).newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto("file://" + path.join(here, ".build", "index.html"));
  await page.getByRole("img", { name: "Online" }).first().waitFor();
  const row = (id) => page.locator(`[data-user="${id}"]`);
  const dotClass = (id) => row(id).locator('[role="img"]').first().getAttribute("class");

  check(`${label}: online ohne Emoji = grüner Punkt`, (await row("dot").locator('[role="img"]').count()) === 1 && (await dotClass("dot")).includes("bg-emerald-500"));
  check(`${label}: Emoji ersetzt den Punkt`, (await row("emoji").locator('[role="img"]').first().textContent()).includes("🌙"));
  check(`${label}: Emoji mit Text zeigt Emoji und Text`, (await row("emojitext").textContent()).includes("✍️") && (await row("emojitext").textContent()).includes("schreibt gerade"));
  check(`${label}: offline = nichts (kein Punkt, kein Text „Offline“)`, (await row("offline").locator('[role="img"]').count()) === 0 && !(await row("offline").textContent()).includes("Offline"));
  check(`${label}: Zähler zeigt nur Punkt und Zahl (2)`, (await page.getByTestId("count").innerText()).trim() === "2");
  check(`${label}: kein seitliches Scrollen`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));

  const save = page.getByRole("button", { name: "Status speichern" });
  check(`${label}: Speichern anfangs gesperrt`, await save.isDisabled());
  await page.getByRole("button", { name: "Emoji 🎲" }).click();
  await page.getByPlaceholder("z. B. schreibt gerade").fill("würfelt");
  check(`${label}: Speichern nach Änderung möglich`, await save.isEnabled());
  await save.click();
  await page.getByRole("status").waitFor();
  const saved = await page.evaluate(() => window.__saved.at(-1));
  check(`${label}: gespeichert (Emoji und Text)`, saved?.[0] === "🎲" && saved?.[1] === "würfelt", JSON.stringify(saved));
  const broadcast = await page.evaluate(() => window.__sent.at(-1));
  check(`${label}: andere Geräte desselben Accounts werden benachrichtigt`, broadcast?.event === "look" && broadcast.payload.emoji === "🎲");
  const tracked = await page.evaluate(() => window.__tracked.at(-1));
  check(`${label}: Anmeldung im Kanal trägt Emoji und Text`, tracked?.emoji === "🎲" && tracked?.text === "würfelt", JSON.stringify(tracked));

  await page.getByRole("textbox", { name: "Emoji" }).fill("abc");
  check(`${label}: Text statt Emoji ist ungültig, Speichern gesperrt`, await save.isDisabled());
  await page.getByRole("button", { name: "Emoji entfernen" }).click();
  await page.getByRole("radio", { name: "Offline" }).click();
  check(`${label}: Offline-Schalter meldet sich ab`, (await page.evaluate(() => window.__tracked.at(-1))) === "untrack");
  if (label === "Handy") await page.screenshot({ path: path.join(here, ".build", "mobile.png"), fullPage: true });
  else await page.screenshot({ path: path.join(here, ".build", "desktop.png"), fullPage: true });
}

check("keine Konsolen-/Seitenfehler", errors.length === 0, errors.join(" | ").slice(0, 300));
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(failed ? `${failed} FEHLGESCHLAGEN` : `Alle ${results.length} Prüfungen bestanden`);
process.exit(failed ? 1 : 0);
