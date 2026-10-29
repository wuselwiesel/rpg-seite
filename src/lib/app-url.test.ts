import { describe, expect, it } from "vitest";
import { appOrigin, appUrl } from "./app-url";

const req = (url: string, headers: Record<string, string> = {}) => ({
  url,
  headers: { get: (n: string) => headers[n.toLowerCase()] ?? null },
});

describe("appOrigin", () => {
  it("nimmt die Weiterleitungs-Header des Proxys statt 0.0.0.0", () => {
    const r = req("http://0.0.0.0:3000/switch-character", { "x-forwarded-host": "app.wortwinkel.xyz", "x-forwarded-proto": "https", host: "0.0.0.0:3000" });
    expect(appOrigin(r)).toBe("https://app.wortwinkel.xyz");
  });
  it("nimmt bei mehreren Werten den ersten", () => {
    expect(appOrigin(req("http://0.0.0.0:3000/", { "x-forwarded-host": "a.example, b.internal", "x-forwarded-proto": "https, http" }))).toBe("https://a.example");
  });
  it("fällt auf den Host-Header zurück, lokal mit http", () => {
    expect(appOrigin(req("http://0.0.0.0:3000/", { host: "localhost:3000" }))).toBe("http://localhost:3000");
  });
  it("ohne Header bleibt die Adresse der Anfrage", () => {
    expect(appOrigin(req("https://wortwinkel.xyz/x"))).toBe("https://wortwinkel.xyz");
  });
});

describe("appUrl", () => {
  it("hängt Pfad und Abfrage an die Adresse der Besucher:in", () => {
    const r = req("http://0.0.0.0:3000/", { "x-forwarded-host": "app.wortwinkel.xyz", "x-forwarded-proto": "https" });
    expect(appUrl(r, "/story/1?as=2&ziel=ende").href).toBe("https://app.wortwinkel.xyz/story/1?as=2&ziel=ende");
  });
});
