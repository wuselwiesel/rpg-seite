// Online-Anzeige der Welt (Story) und „schreibt …“: nur andere Online-Personen, Klick zeigt Namen, nichts ohne Online-Personen; Chat-Zeilen-Punkt; Tipp-Anzeige.
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
  const head = page.getByTestId("story-head");
  const toggle = head.getByRole("button", { name: /^Online:/ });
  await toggle.waitFor();

  const label_ = await toggle.getAttribute("aria-label");
  check(`${label}: zeigt die Online-Personen ohne mich`, label_.includes("Hörnchen") && label_.includes("Streuselschnecke") && !label_.includes("Ich") && !label_.includes("Offline-Person"), label_);
  check(`${label}: höchstens 4 Bilder, Rest als +2`, (await toggle.locator("img, div").count()) >= 4 && (await toggle.innerText()).includes("+2"), await toggle.innerText());
  const box = await toggle.boundingBox();
  check(`${label}: klein und unauffällig (Höhe ≤ 32 px)`, box.height <= 32, String(box.height));
  check(`${label}: keine Liste vor dem Klick`, (await head.locator("ul").count()) === 0);
  await toggle.click();
  const names = await head.locator("ul li").allInnerTexts();
  check(`${label}: Klick zeigt alle Namen`, names.length === 6 && names.includes("Hörnchen"), names.join("|"));
  const pop = await head.locator("ul").boundingBox();
  check(`${label}: Liste liegt im Bild`, pop.x >= 0 && pop.x + pop.width <= w && pop.y + pop.height <= h);
  await page.mouse.click(5, h - 5);
  check(`${label}: Klick daneben schließt`, (await head.locator("ul").count()) === 0);
  await toggle.click();
  await page.keyboard.press("Escape");
  check(`${label}: Escape schließt`, (await head.locator("ul").count()) === 0);

  check(`${label}: niemand online = nichts`, (await page.getByTestId("empty").innerText()).trim() === "" && (await page.getByTestId("empty").locator("button").count()) === 0);
  check(`${label}: Chat-Zeile mit mehreren: Punkt, sobald jemand online ist`, (await page.getByTestId("any").getByRole("img", { name: "Online" }).count()) === 1);
  check(`${label}: Chat-Zeile ohne Online-Personen: kein Punkt`, (await page.getByTestId("none").getByRole("img").count()) === 0);

  // Wenn alle gehen, verschwindet die Anzeige
  await page.evaluate(() => { window.__presence = { me: [{ at: 1 }] }; window.__sync(); });
  await page.waitForTimeout(150);
  check(`${label}: alle offline = Anzeige verschwindet`, (await head.getByRole("button", { name: /^Online:/ }).count()) === 0);
  await page.evaluate(() => { window.__presence = { me: [{ at: 1 }], a: [{ at: 1 }] }; window.__sync(); });
  await page.waitForTimeout(150);
  const one = head.getByRole("button", { name: /^Online:/ });
  check(`${label}: eine Person: Name im Hinweis, kein „+“`, (await one.getAttribute("aria-label")) === "Online: Hörnchen" && !(await one.innerText()).includes("+"));

  // „schreibt …“
  const typing = page.getByTestId("typing");
  check(`${label}: anfangs keine Tipp-Anzeige`, (await typing.innerText()).trim() === "");
  await page.evaluate(() => window.__bcast.typing({ payload: { characterId: "me", name: "Ich" } }));
  await page.waitForTimeout(150);
  check(`${label}: eigenes Signal wird ignoriert`, (await typing.innerText()).trim() === "");
  await page.evaluate(() => window.__bcast.typing({ payload: { characterId: "x", name: "Lucian" } }));
  await page.waitForTimeout(150);
  check(`${label}: „Lucian schreibt…“`, (await typing.innerText()).includes("Lucian schreibt…"));
  await page.evaluate(() => window.__bcast.typing({ payload: { characterId: "y", name: "Nick" } }));
  await page.waitForTimeout(150);
  check(`${label}: zwei Personen`, (await typing.innerText()).includes("Lucian, Nick schreibt…"));
  await page.getByRole("button", { name: "leeren" }).click();
  await page.waitForTimeout(150);
  check(`${label}: eine neue Nachricht beendet die Anzeige`, (await typing.innerText()).trim() === "");
  await page.evaluate(() => window.__bcast.typing({ payload: { characterId: "x", name: "Lucian" } }));
  await page.waitForTimeout(5600);
  check(`${label}: ohne neues Signal verschwindet sie nach ca. 4 s`, (await typing.innerText()).trim() === "");

  // Senden ist begrenzt: mehrere Tipp-Ereignisse hintereinander = ein Signal
  await page.evaluate(() => { window.__sent.length = 0; });
  const btn = page.getByRole("button", { name: "tippen" });
  await btn.click(); await btn.click(); await btn.click();
  const sent = await page.evaluate(() => window.__sent.filter((m) => m.event === "typing"));
  check(`${label}: nur ein Signal pro Zeitfenster`, sent.length === 1 && sent[0].payload.characterId === "me", JSON.stringify(sent));
  check(`${label}: kein seitliches Scrollen`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.screenshot({ path: path.join(here, `.build/${label}.png`) });
}
check("keine Konsolenfehler", errors.length === 0, errors.join(" | "));
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
