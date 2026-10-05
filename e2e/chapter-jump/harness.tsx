// Testseite: Kapitel-Sprung in einer langen Szene (Kapitelleiste oben, eingeklappte frühere Beiträge, schwebender Sprung).
import { createRoot } from "react-dom/client";
import { ChapterJump } from "@/app/story/[id]/chapter-jump";
import { EarlierEntries } from "@/app/story/[id]/earlier-entries";

const chapters = [
  { n: 1, title: "Der Geburtstag" },
  { n: 2, title: "Die Party" },
];
const filler = (k: string, n: number) => Array.from({ length: n }, (_, i) => <p key={`${k}${i}`} style={{ margin: "0 0 12px", height: 60 }}>Beitrag {k}{i}</p>);

createRoot(document.getElementById("root")!).render(
  <div style={{ maxWidth: 640, padding: 16 }} className="text-fg">
    <h1>Szene</h1>
    <nav aria-label="Kapitel" className="mb-4 flex flex-wrap gap-2">
      {chapters.map((c) => (
        <a key={c.n} href={`#kapitel-${c.n}`} className="rounded-full bg-surface-2 px-3 py-1 text-xs">
          {c.n} · {c.title}
        </a>
      ))}
    </nav>
    <EarlierEntries count={12}>
      {filler("a", 6)}
      <h3 id="kapitel-1" className="scroll-mt-20">Kapitel 1 Der Geburtstag</h3>
      {filler("b", 6)}
      <h3 id="kapitel-2" className="scroll-mt-20">Kapitel 2 Die Party</h3>
      {filler("c", 6)}
    </EarlierEntries>
    {filler("neu", 24)}
    <div id="letzter-beitrag">Ende</div>
    <div className="pointer-events-none fixed bottom-6 right-4 z-20 flex items-center gap-2">
      <ChapterJump chapters={chapters} />
    </div>
  </div>,
);
