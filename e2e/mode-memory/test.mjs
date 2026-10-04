// Modus beim Wechsel zu Charakterprofilen: Profil in der Story bleibt in der Story, Profil aus dem Ingame bleibt Ingame.
import { chromium } from "playwright-core";
import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import fs from "node:fs";
import "./build.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
// Cookies gibt es nicht auf file://-Seiten; darum liefert ein kleiner lokaler Server die Testseite aus.
const server = http.createServer((req, res) => {
  const file = req.url?.startsWith("/out.js") ? "out.js" : "index.html";
  res.setHeader("content-type", file.endsWith(".js") ? "text/javascript" : "text/html");
  res.end(fs.readFileSync(path.join(here, ".build", file)));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/index.html`;
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined, args: ["--no-sandbox"] });
const results = [];
const check = (name, ok, extra = "") => {
  results.push(ok);
  console.log(ok ? "OK  " : "FAIL", name, extra);
};

async function fresh(query = "") {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url + query);
  const go = async (p) => {
    await page.evaluate((x) => window.__setPath(x), p);
    await page.waitForTimeout(60);
  };
  const mode = () => page.getByTestId("mode").innerText();
  const cookie = () => page.evaluate(() => document.cookie);
  return { ctx, page, errors, go, mode, cookie };
}

{
  const { ctx, go, mode, cookie, errors } = await fresh();
  check("Startseite ist Ingame", (await mode()) === "ingame");
  await go("/story");
  check("Story ist Story", (await mode()) === "story");
  await go("/characters/abc");
  check("Profil aus der Story bleibt in der Story", (await mode()) === "story");
  await go("/characters/abc/follows");
  check("auch Unterseiten des Profils (Folgen)", (await mode()) === "story");
  await go("/characters/abc/edit");
  check("…und Bearbeiten", (await mode()) === "story");
  await go("/");
  check("Feed ist wieder Ingame", (await mode()) === "ingame");
  await go("/characters/abc");
  check("Profil aus dem Ingame bleibt Ingame", (await mode()) === "ingame");
  await go("/wiki");
  await go("/characters/relationships");
  check("Beziehungsnetz zählt zur Story", (await mode()) === "story");
  await go("/characters/abc");
  check("Profil nach dem Beziehungsnetz bleibt in der Story", (await mode()) === "story");
  await go("/characters");
  check("Charakterliste ist Ingame (kein Profil)", (await mode()) === "ingame");
  await go("/characters/abc/chabo");
  check("ChaBo ist Story", (await mode()) === "story");
  await go("/redaktion");
  check("Redaktion ist Redaktion", (await mode()) === "redaktion");
  await go("/characters/abc");
  check("Profil nach der Redaktion nimmt den zuletzt benutzten Modus (Story)", (await mode()) === "story");
  check("Der Modus steht im Sitzungs-Cookie", (await cookie()).includes("ww_mode=story"), await cookie());
  await go("/search");
  check("Cookie wechselt mit dem Bereich", (await cookie()).includes("ww_mode=ingame"));
  check("keine Seitenfehler", errors.length === 0, errors.join("|"));
  await ctx.close();
}
{
  // Seite wird direkt auf einem Profil geladen; der Server gibt den gemerkten Modus aus dem Cookie mit
  const a = await fresh("?pfad=/characters/abc&start=story");
  check("Direktaufruf des Profils mit gemerktem Story-Modus: Story (kein Flackern)", (await a.mode()) === "story");
  await a.ctx.close();
  const b = await fresh("?pfad=/characters/abc");
  check("Direktaufruf ohne Merkzettel: Ingame", (await b.mode()) === "ingame");
  await b.ctx.close();
}

await browser.close();
server.close();
const failed = results.filter((r) => !r).length;
console.log(failed ? `${failed} Test(e) fehlgeschlagen` : `Alle ${results.length} Prüfungen bestanden`);
process.exit(failed ? 1 : 0);
