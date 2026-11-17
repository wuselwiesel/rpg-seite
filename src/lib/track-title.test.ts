import { describe, expect, it } from "vitest";
import { oembedUrl } from "./track-title";

describe("oembedUrl", () => {
  it("baut die Spotify-Abfrage aus der Titel-Adresse", () => {
    expect(oembedUrl("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=abc")).toBe(
      "https://open.spotify.com/oembed?url=" + encodeURIComponent("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC"),
    );
  });
  it("kennt YouTube und SoundCloud", () => {
    expect(oembedUrl("https://youtu.be/dQw4w9WgXcQ")).toContain("https://www.youtube.com/oembed?format=json&url=");
    expect(oembedUrl("https://soundcloud.com/artist/song")).toContain("https://soundcloud.com/oembed?format=json&url=");
  });
  it("fragt nichts ab bei Audiodatei, Jam und fremden Adressen", () => {
    expect(oembedUrl("https://example.com/lied.mp3")).toBeNull();
    expect(oembedUrl("https://open.spotify.com/socialsession/abc123")).toBeNull();
    expect(oembedUrl("https://evil.example/oembed")).toBeNull();
    expect(oembedUrl("")).toBeNull();
  });
});
