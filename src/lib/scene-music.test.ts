import { describe, expect, it } from "vitest";
import { parseMusicLink } from "./scene-music";

describe("parseMusicLink", () => {
  it("erkennt YouTube-Links in verschiedenen Formen", () => {
    expect(parseMusicLink("https://www.youtube.com/watch?v=dQw4w9WgXcQ")?.kind).toBe("youtube");
    expect(parseMusicLink("https://youtu.be/dQw4w9WgXcQ?t=3")).toMatchObject({ kind: "youtube", embed: expect.stringContaining("/embed/dQw4w9WgXcQ") });
    expect(parseMusicLink("https://www.youtube.com/playlist?list=PLabcdefghijklmnop")).toMatchObject({ kind: "youtube", embed: expect.stringContaining("videoseries?list=") });
  });
  it("erkennt Spotify und SoundCloud", () => {
    expect(parseMusicLink("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=x")).toMatchObject({ kind: "spotify", embed: "https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC", uri: "spotify:track:4uLU6hMCjMI75M1A2tKUQC" });
    expect(parseMusicLink("https://soundcloud.com/artist/track")?.kind).toBe("soundcloud");
  });
  it("erkennt Spotify Jam und Kurzlinks als externen Link", () => {
    expect(parseMusicLink("https://open.spotify.com/socialsession/AbC123xyz?si=1")).toMatchObject({ kind: "external", detail: "Jam" });
    expect(parseMusicLink("https://spotify.link/Ab12Cd")).toMatchObject({ kind: "external", detail: "Link" });
    expect(parseMusicLink("https://spotify.link/")).toBeNull();
  });
  it("erkennt Audiodateien", () => {
    expect(parseMusicLink("https://example.com/musik/sturm.mp3")).toMatchObject({ kind: "audio" });
  });
  it("lehnt alles andere ab", () => {
    expect(parseMusicLink("javascript:alert(1)")).toBeNull();
    expect(parseMusicLink("https://example.com/seite")).toBeNull();
    expect(parseMusicLink("kein link")).toBeNull();
    expect(parseMusicLink("")).toBeNull();
  });
});
