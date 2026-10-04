// Chat-Blase: verschieben (Maus und Touch), Seite merken, Antippen öffnet.
import { chromium } from "playwright-core";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./build.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined, args: ["--no-sandbox"] });
const results = [];
const check = (name, ok, extra = "") => { results.push(ok); console.log(ok ? "OK  " : "FAIL", name, extra); };
const errors = [];
const url = "file://" + path.join(here, ".build", "index.html");

async function open(opts) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url);
  const bubble = page.getByRole("button", { name: /Chats öffnen/ });
  await bubble.waitFor();
  return { ctx, page, bubble };
}
const center = async (loc) => { const b = await loc.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, b }; };

// Maus (Laptop)
{
  const { ctx, page, bubble } = await open({ viewport: { width: 1280, height: 800 } });
  const before = await center(bubble);
  check("Laptop: Blase steht rechts unten", before.x > 1200 && before.y > 400, JSON.stringify(before));
  await page.mouse.move(before.x, before.y);
  await page.mouse.down();
  await page.mouse.move(before.x - 200, before.y - 100, { steps: 8 });
  await page.mouse.move(100, 300, { steps: 8 });
  const during = await center(bubble);
  check("Laptop: Blase folgt der Maus beim Ziehen", Math.abs(during.x - 100) < 4 && Math.abs(during.y - 300) < 4, JSON.stringify(during));
  await page.mouse.up();
  const after = await center(bubble);
  check("Laptop: Blase rastet links ein (Höhe bleibt)", after.x < 100 && Math.abs(after.y - 300) < 6, JSON.stringify(after));
  check("Laptop: Ziehen öffnet nichts", (await page.getByRole("dialog").count()) === 0);
  await page.reload();
  const again = await center(page.getByRole("button", { name: /Chats öffnen/ }));
  check("Laptop: Position bleibt nach dem Neuladen", again.x < 100 && Math.abs(again.y - 300) < 6, JSON.stringify(again));
  await ctx.close();
}
// Touch (Handy)
{
  const { ctx, page, bubble } = await open({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y, id: 0 }] });
  const before = await center(bubble);
  await touch("touchStart", before.x, before.y);
  for (let i = 1; i <= 10; i++) await touch("touchMove", before.x - ((before.x - 40) * i) / 10, before.y - (150 * i) / 10);
  await touch("touchEnd");
  await page.waitForTimeout(150);
  const after = await center(bubble);
  check("Handy: Blase lässt sich verschieben (links, höher)", after.x < 80 && after.y < before.y - 100, JSON.stringify({ before, after }));
  // Antippen öffnet
  await touch("touchStart", after.x, after.y);
  await touch("touchEnd");
  await page.waitForTimeout(300);
  check("Handy: Antippen öffnet das Chat-Fenster", (await page.getByRole("button", { name: /Chats öffnen/ }).count()) === 0 || (await page.getByText(/Chats|Keine/).count()) > 0);
  await ctx.close();
}
// Mit ungelesenen Nachrichten zeigt die Blase das Bild des Absenders: auch dann muss sie sich verschieben lassen
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url + "?unread=1");
  const bubble = page.getByRole("button", { name: /Chats öffnen/ });
  await bubble.waitFor();
  // Chatliste laden (öffnen und wieder schließen), damit die Blase das Bild des letzten Absenders zeigt
  await bubble.click();
  await page.getByRole("dialog", { name: "Chats" }).waitFor();
  await page.getByRole("button", { name: "Schließen" }).click();
  await bubble.waitFor();
  check("Blase zeigt das Bild des Absenders", (await bubble.locator("img").count()) === 1);
  check("Bild in der Blase ist nicht ziehbar", (await bubble.locator("img").getAttribute("draggable")) === "false");
  const before = await center(bubble);
  await page.mouse.move(before.x, before.y);
  await page.mouse.down();
  await page.mouse.move(before.x - 150, before.y - 80, { steps: 8 });
  await page.mouse.move(120, 260, { steps: 8 });
  const during = await center(bubble);
  check("Mit Bild: Blase folgt der Maus beim Ziehen", Math.abs(during.x - 120) < 4 && Math.abs(during.y - 260) < 4, JSON.stringify(during));
  await page.mouse.up();
  const after = await center(bubble);
  check("Mit Bild: Blase rastet links ein", after.x < 100 && Math.abs(after.y - 260) < 6, JSON.stringify(after));
  check("Mit Bild: Ziehen öffnet nichts", (await page.getByRole("dialog").count()) === 0);
  await ctx.close();
}
check("keine Seitenfehler", errors.length === 0, errors.join(" | ").slice(0, 300));
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(failed ? `${failed} FEHLGESCHLAGEN` : `Alle ${results.length} Prüfungen bestanden`);
process.exit(failed ? 1 : 0);
