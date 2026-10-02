// Wiki-Graph im echten Browser: Anzeige, Auswahl, Fokus, Filter, Zoom, Pinch, Tastatur.
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

async function fresh(query = "", opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 900 }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url + query);
  await page.locator('[data-testid="graph-svg"]').waitFor();
  const nodes = () => page.locator("[data-node]").evaluateAll((els) => els.map((e) => e.getAttribute("data-node")));
  const scale = () =>
    page.evaluate(() => {
      const g = document.querySelector('[data-testid="graph-svg"] > g');
      const m = /scale\(([\d.]+)\)/.exec(g.getAttribute("transform"));
      return m ? Number(m[1]) : 1;
    });
  return { ctx, page, errors, nodes, scale };
}

// 1. Ganzes Wiki: nur verbundene Seiten, Einzelgänger darunter
{
  const { ctx, page, errors, nodes } = await fresh();
  const n = await nodes();
  check("zeigt die 6 verbundenen Seiten", n.length === 6 && !n.includes("allein"), JSON.stringify(n));
  check("Einzelgänger steht unter „Ohne Verbindung“", (await page.locator("#ohne-verbindung").count()) === 1 && (await page.getByRole("link", { name: "Einzelgänger" }).count()) === 1);
  check("5 Linien, eine gestrichelt (Unterseite)", (await page.locator("[data-edge]").count()) === 5 && (await page.locator("[data-edge][stroke-dasharray]").count()) === 1);
  check("einseitige Verweise haben eine Pfeilspitze, gegenseitige nicht", (await page.locator("[data-edge][marker-end]").count()) === 3);
  check("keine Seitenfehler", errors.length === 0, errors.join("|"));
  await page.screenshot({ path: path.join(here, ".build", "graph.png"), fullPage: true });
  await ctx.close();
}
// 2. Auswahl zeigt Karte mit Verbindungen
{
  const { ctx, page } = await fresh();
  await page.locator('[data-node="vamp"]').click();
  const card = page.getByRole("region", { name: "Ausgewählte Seite" });
  check("Karte mit Titel und Kurztext", (await card.getByRole("heading", { name: "Vampire" }).count()) === 1 && (await card.innerText()).includes("Jäger der Nacht"));
  const text = await card.innerText();
  check("listet gegenseitige, ausgehende, eingehende und Unterseiten", text.includes("Nebelhafen") && text.includes("Werwölfe") && text.includes("Der Rat") && text.includes("Sireline"), text.replace(/\n/g, " | "));
  check("Link zur Seite", (await card.getByRole("link", { name: "Seite öffnen" }).getAttribute("href")) === "/wiki/vamp");
  await ctx.close();
}
// 3. Fokus: direkte Nachbarn, dann Tiefe 2
{
  const { ctx, page, nodes } = await fresh();
  await page.locator('[data-node="hafen"]').click();
  await page.getByRole("button", { name: "Fokus hierhin" }).click();
  await page.waitForTimeout(100);
  let n = (await nodes()).sort();
  check("Fokus „Nebelhafen“ zeigt direkte Nachbarn", n.join() === ["burg", "hafen", "vamp"].join(), n.join());
  await page.getByRole("button", { name: "+ Bekannte" }).click();
  n = (await nodes()).sort();
  check("„+ Bekannte“ nimmt deren Nachbarn dazu", n.length === 6 && n.includes("wolf") && n.includes("rat") && n.includes("sire"), n.join());
  await page.getByRole("button", { name: "Ganzes Wiki" }).click();
  check("Ganzes Wiki", (await nodes()).length === 6);
  await ctx.close();
}
// 4. Start mit ?fokus=
{
  const { ctx, nodes } = await fresh("?fokus=burg");
  check("Startfokus aus der Adresse", (await nodes()).sort().join() === ["burg", "hafen"].join());
  await ctx.close();
}
// 5. Filter nach Art und Tag
{
  const { ctx, page, nodes } = await fresh();
  await page.getByLabel("Art").selectOption("spezies");
  check("Filter Art: Spezies", (await nodes()).sort().join() === ["vamp", "wolf"].join());
  await page.getByLabel("Art").selectOption("");
  await page.getByLabel("Tag").selectOption("Küste");
  check("Filter Tag: Küste", (await nodes()).sort().join() === ["burg", "hafen"].join());
  await ctx.close();
}
// 6. Suche stellt eine Seite in den Mittelpunkt
{
  const { ctx, page, nodes } = await fresh();
  await page.getByLabel("Seite suchen").fill("burg");
  await page.locator("ul button", { hasText: "Alte Burg" }).click();
  check("Suche setzt den Fokus", (await nodes()).sort().join() === ["burg", "hafen"].join());
  await ctx.close();
}
// 7. Zoom, Ziehen bleibt im Bild, Tastatur
{
  const { ctx, page, scale } = await fresh();
  const svg = page.locator('[data-testid="graph-svg"]');
  const box = await svg.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -600);
  await page.waitForTimeout(80);
  check("Mausrad zoomt", (await scale()) > 1.5, String(await scale()));
  await page.getByRole("button", { name: "Ansicht zurücksetzen" }).click();
  check("Zurücksetzen", (await scale()) === 1);
  await page.locator('[data-node="rat"]').focus();
  await page.keyboard.press("Enter");
  check("Enter wählt eine Seite aus", (await page.getByRole("region", { name: "Ausgewählte Seite" }).getByRole("heading", { name: "Der Rat" }).count()) === 1);
  await ctx.close();
}
// 8. Pinch per Touch
{
  const { ctx, page, scale } = await fresh("", { hasTouch: true, isMobile: true, viewport: { width: 420, height: 800 } });
  const box = await page.locator('[data-testid="graph-svg"]').boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) });
  await touch("touchStart", [[cx - 30, cy], [cx + 30, cy]]);
  for (let i = 1; i <= 8; i++) await touch("touchMove", [[cx - 30 - i * 10, cy], [cx + 30 + i * 10, cy]]);
  await touch("touchEnd", []);
  await page.waitForTimeout(100);
  check("Zwei Finger zoomen hinein", (await scale()) > 1.8, String(await scale()));
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(failed ? `${failed} Test(e) fehlgeschlagen` : `Alle ${results.length} Prüfungen bestanden`);
process.exit(failed ? 1 : 0);
