// Testseite für „Ins Wiki“ aus einer Szene
import { createRoot } from "react-dom/client";
import { SelectionToWiki } from "@/app/story/[id]/selection-to-wiki";

function App() {
  return (
    <div style={{ padding: 20, maxWidth: 600 }}>
      <div id="beitrag-11111111-1111-4111-8111-111111111111"><p id="a">Lucian Marlowe öffnete die Tür und lächelte.</p></div>
      <div id="beitrag-22222222-2222-4222-8222-222222222222"><p id="b">Zweiter Beitrag mit anderem Text.</p></div>
      <p id="outside">Text außerhalb eines Beitrags.</p>
      <SelectionToWiki sceneId="33333333-3333-4333-8333-333333333333" />
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
