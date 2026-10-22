// „Ins Wiki“ aus einer Szene im echten Browser: markieren, Knopf, Dialog, Anhängen.
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

const ctx = await browser.newContext({ viewport: { width: 700, height: 600 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(url);

const select = (id, from, to) =>
  page.evaluate(([id, from, to]) => {
    const node = document.getElementById(id).firstChild;
    const r = document.createRange();
    r.setStart(node, from);
    r.setEnd(node, to);
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
  }, [id, from, to]);

// 1. Auswahl außerhalb eines Beitrags: kein Knopf
await select("outside", 0, 10);
await page.waitForTimeout(200);
check("außerhalb eines Beitrags kein Knopf", (await page.getByRole("button", { name: "Ins Wiki" }).count()) === 0);

// 2. Auswahl im Beitrag: Knopf erscheint
await select("a", 0, 14);
const btn = page.getByRole("button", { name: "Ins Wiki" });
await btn.waitFor({ timeout: 2000 });
check("im Beitrag erscheint „Ins Wiki“", true);
const box = await btn.boundingBox();
check("Knopf liegt im Bildschirm", box && box.x >= 0 && box.x + box.width <= 700 && box.y >= 0 && box.y + box.height <= 600, JSON.stringify(box));

// 3. Dialog: Notiz vorbefüllt, Seite vorgewählt (Titel kommt im Text vor)
await btn.click();
const dialog = page.getByRole("dialog", { name: "Ins Wiki" });
await dialog.waitFor();
const note = await dialog.locator("textarea").inputValue();
check("Notiz ist mit dem markierten Text vorbefüllt", note === "„Lucian Marlowe“", note);
await dialog.getByText("Lucian Marlowe", { exact: true }).first().waitFor();
check("Seite „Lucian Marlowe“ ist vorgewählt", (await dialog.getByRole("button", { name: "Ändern" }).count()) === 1);

// 4. Anhängen
await dialog.locator("textarea").fill("Lucian öffnet die Tür");
await dialog.getByRole("button", { name: "Anhängen" }).click();
await dialog.getByText("Angehängt an „Lucian Marlowe“").waitFor();
const calls = await page.evaluate(() => window.__calls);
check("Aufruf mit Seite, Notiz, Szene und Beitrag", calls.length === 1 && calls[0].pageId === "p1" && calls[0].note === "Lucian öffnet die Tür" && calls[0].sceneId.startsWith("3333") && calls[0].entryId.startsWith("1111"), JSON.stringify(calls));
check("„Seite öffnen“ führt zur Wiki-Seite", (await dialog.getByRole("link", { name: "Seite öffnen" }).getAttribute("href")) === "/wiki/p1");

// 5. Auswahl über zwei Beiträge: kein Knopf
await page.keyboard.press("Escape").catch(() => {});
await page.getByRole("button", { name: "Schließen" }).click();
await page.evaluate(() => {
  const a = document.getElementById("a").firstChild;
  const b = document.getElementById("b").firstChild;
  const r = document.createRange();
  r.setStart(a, 3);
  r.setEnd(b, 8);
  const s = window.getSelection();
  s.removeAllRanges();
  s.addRange(r);
});
await page.waitForTimeout(250);
check("über zwei Beiträge kein Knopf", (await page.getByRole("button", { name: "Ins Wiki" }).count()) === 0);

check("keine Seitenfehler", errors.length === 0, errors.join("|"));
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} bestanden`);
process.exit(failed ? 1 : 0);
