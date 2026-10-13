import { describe, expect, it } from "vitest";
import { PWNED_MESSAGE, pwnedCount, pwnedPasswordError } from "./pwned-password";

// SHA-1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
const ok = (body: string) => async () => ({ ok: true, text: async () => body });

describe("pwnedCount", () => {
  it("findet den Hash-Rest in der Antwort und liefert die Anzahl", async () => {
    let requested = "";
    const fetchFn = async (url: string) => {
      requested = url;
      return { ok: true, text: async () => "0000000000000000000000000000000000A:3\r\n1E4C9B93F3F0682250B6CF8331B7EE68FD8:9545824\r\n" };
    };
    expect(await pwnedCount("password", fetchFn)).toBe(9545824);
    expect(requested).toBe("https://api.pwnedpasswords.com/range/5BAA6");
  });

  it("liefert 0, wenn der Rest fehlt oder nur als Füller (0) vorkommt", async () => {
    expect(await pwnedCount("password", ok("ABCDEF:5\r\n"))).toBe(0);
    expect(await pwnedCount("password", ok("1E4C9B93F3F0682250B6CF8331B7EE68FD8:0"))).toBe(0);
  });

  it("liefert null bei Fehlern, damit die Registrierung nicht blockiert", async () => {
    expect(await pwnedCount("password", async () => ({ ok: false, text: async () => "" }))).toBeNull();
    expect(await pwnedCount("password", async () => { throw new Error("offline"); })).toBeNull();
  });
});

describe("pwnedPasswordError", () => {
  it("meldet geleakte Passwörter und lässt andere durch", async () => {
    expect(await pwnedPasswordError("password", ok("1E4C9B93F3F0682250B6CF8331B7EE68FD8:12"))).toBe(PWNED_MESSAGE);
    expect(await pwnedPasswordError("password", ok("FFFF:1"))).toBeNull();
    expect(await pwnedPasswordError("password", async () => { throw new Error("offline"); })).toBeNull();
  });
});
