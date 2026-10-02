// Testseite für das @ im Wiki-Editor: zeigt den gespeicherten HTML-Text unter dem Editor an.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { RichTextEditor } from "@/components/rich-text-editor";

const pages = [
  { id: "a1", title: "Vampire" },
  { id: "a2", title: "Nebelhafen" },
  { id: "a3", title: "Alte Vampirburg" },
];

function App() {
  const [html, setHtml] = useState("");
  return (
    <div style={{ padding: 20, maxWidth: 700 }}>
      <RichTextEditor
        name="content"
        wikiPages={pages}
        wikiCharacters={[{ id: "11111111-1111-4111-8111-111111111111", name: "Lucian", avatar_url: null }]}
        allowBlocks
        initialContent={location.hash ? decodeURIComponent(location.hash.slice(1)) : undefined}
        onChange={setHtml}
      />
      <pre id="out">{html}</pre>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
