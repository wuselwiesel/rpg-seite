import { chromium } from "/home/user/rpg-seite/node_modules/playwright-core/index.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage();
for (const [i, o] of [["anleitung2.html", "wortwinkel-anleitung.pdf"], ["anleitung_ohne_wuerfeln.html", "wortwinkel-anleitung-ohne-wuerfeln.pdf"]]) {
  await p.goto("file:///tmp/claude-0/guide/" + i); await p.waitForTimeout(600);
  await p.pdf({ path: "/home/user/rpg-seite/docs/" + o, preferCSSPageSize: true, printBackground: true });
}
await b.close();
