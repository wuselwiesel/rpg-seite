import { createRoot } from "react-dom/client";
import { ZoomAvatar } from "@/components/zoom-avatar";

const img = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="#a66"/></svg>');
createRoot(document.getElementById("root")!).render(
  <div style={{ padding: 20, display: "flex", gap: 20 }}>
    <div id="a"><ZoomAvatar name="Dana Grey" avatarUrl={img} size={28} /></div>
    <div id="b"><ZoomAvatar name="Ohne Bild" avatarUrl={null} size={28} /></div>
  </div>,
);
