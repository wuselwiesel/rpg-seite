// Emoji-Fenster an verschiedenen Stellen des Bildschirms (oben, Mitte, ganz unten, am rechten Rand).
import { createRoot } from "react-dom/client";
import { CustomEmojiPicker } from "@/components/custom-emoji-picker";

const spots: Record<string, React.CSSProperties> = {
  top: { top: 16, left: 16 },
  middle: { top: "45%", left: 200 },
  bottom: { bottom: 24, left: 80 },
  right: { bottom: 24, right: 8 },
};
const which = new URLSearchParams(location.search).get("spot") ?? "bottom";
const dir = (new URLSearchParams(location.search).get("dir") ?? "down") as "up" | "down";

createRoot(document.getElementById("root")!).render(
  <div style={{ position: "fixed", ...spots[which] }}>
    <CustomEmojiPicker direction={dir} onPick={() => {}} />
  </div>,
);
