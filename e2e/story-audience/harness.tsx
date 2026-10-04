// Story-Viewer: Besitzerin sieht, wer die Story gesehen/geliked hat; Betrachtende werden als Ansicht eingetragen.
import { createRoot } from "react-dom/client";
import { StoryLauncher, type StoryGroup } from "@/components/story-viewer";
import type { Story } from "@/lib/types";

const story = { id: "s1", character_id: "own", image_url: null, video_url: null, text_content: "Hallo Welt", bg: null, overlays: null, audio_url: null, audio_name: null, audio_start: 0, audio_length: null, created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 86400000).toISOString() } as unknown as Story;
const mode = new URLSearchParams(location.search).get("as") ?? "owner";
const group: StoryGroup = { key: "g", characterId: mode === "owner" ? "own" : "other", characterName: mode === "owner" ? "Lyra" : "Finn", avatarUrl: null, stories: [story], canManage: mode === "owner" };

createRoot(document.getElementById("root")!).render(
  <StoryLauncher groups={[group]} viewerCharacterId={mode === "owner" ? "own" : "viewer"} label="Story öffnen">
    <span>Story</span>
  </StoryLauncher>,
);
