"use client";

import { useState } from "react";

// Symbole zum Einfügen in Texte (Story, Wiki). Text-Symbole funktionieren auf allen Geräten; die Emoji-Gruppe ist bunt.
const s = (chars: string) => Array.from(chars.replace(/\s+/g, ""));

const GROUPS: { name: string; items: string[] }[] = [
  {
    name: "Zierat",
    items: [
      ...s("❦❧☙⚜✦✧✶✷✸✹❖❈❉❊❋✿❀❁✾✽✻✼❂✺✵✴✳✲✱✰⁂⁕※⁜✤✥✢✣❃❄❅❆❇❁⚘☘❋✪✫✬✭✮✯"),
      "✦ ✦ ✦",
      "• • •",
      "❖ ⋆ ❖",
      "☙ ❦ ❧",
      "──── ✦ ────",
      "═══ ❖ ═══",
    ],
  },
  {
    name: "Sterne & Himmel",
    items: s("★☆✩✪✫✬✭✮✯⚝✡☀☼☽☾☄☁☂☃☔⚡❄☈☉☊☋☌☍♁⛅⛈⛄☁☾☽✧✦⋆⭒⭑"),
  },
  {
    name: "Herzen",
    items: s("♥♡❤❥❣❦❧☙ღ❢♠♣♦♤♧♢⚘✿❀❁⛧"),
  },
  {
    name: "Pfeile",
    items: s("→←↑↓↔↕↗↘↙↖⇒⇐⇑⇓⇔➔➜➝➞➤➢➣↩↪↺↻⟲⟳⤴⤵↝↭⇝⟶⟵⟷➳➵➸➺➻➼➽⤳⇢⇠⇡⇣↦↤↧↥⌁"),
  },
  {
    name: "Kampf & Magie",
    items: s("⚔⚒⚓⚖⚗⚙⚚⚛⚜☠☢☣☯☸☮†‡✝✞✟✠☦☨☩☪☫☬⛧⛤⛥⛦⚰⚱⛨⛊⛏⛓⌘⌛⏳⚠☤☥☧☬♆⚕⚚"),
  },
  {
    name: "Tierkreis & Planeten",
    items: s("♈♉♊♋♌♍♎♏♐♑♒♓☿♀♁♂♃♄♅♆♇⚳⚴⚵⚶⚷⚸⚹⚺⚻⚼☉☽☊☋☌☍"),
  },
  {
    name: "Schach, Karten, Würfel",
    items: s("♔♕♖♗♘♙♚♛♜♝♞♟♠♣♥♦♤♧♡♢⚀⚁⚂⚃⚄⚅⛀⛁⛂⛃⚐⚑"),
  },
  {
    name: "Musik",
    items: s("♩♪♫♬♭♮♯𝄞𝄢𝄪𝄫"),
  },
  {
    name: "Satzzeichen",
    items: s("—–…·•‣⁃‹›«»„“”‚‘’¿¡‼⁇⁈⁉§¶†‡°′″‰⁄∞≈≠±×÷½⅓¼¾™©®℮№℗⌈⌉⌊⌋〈〉⟨⟩【】「」『』〔〕⟦⟧"),
  },
  {
    name: "Trenner",
    items: [
      ...s("─━═┈┄⋯⁘⁙⁚⁛⁝⁞⸻﹏‿⁀≋∿⌇"),
      "· · ·",
      "─── ⋆ ───",
      "✧･ﾟ:*✧･ﾟ:*",
      "•·.·´¯`·.·•",
      "⋆｡°✩₊",
      "───── ❦ ─────",
    ],
  },
  {
    name: "Zahlen",
    items: s("⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ①②③④⑤⑥⑦⑧⑨⑩❶❷❸❹❺❻❼❽❾❿"),
  },
  {
    name: "Natur & Wetter",
    items: s("☀☁☂☃☄❄⚡☔☘⚘❀✿♨⛆⛇⛈⛅⛄⛱⛰⛲⛺⛵⛴✈⚓☾☽❅❆"),
  },
  {
    name: "Emoji",
    items: [
      "🌙","🔥","⚔️","🗡️","🛡️","🏹","🔮","📜","🕯️","🗝️","👑","💀","🐺","🦇","🐉","🌹","🍷","⚗️","🕸️","🌲",
      "🏰","⛵","⚓","🌊","🌫️","💎","🪶","🦉","🪦","🩸","✨","🌟","⭐","🌌","❤️","🖤","💜","🤍","💔","🔔",
      "🧙","🧛","🧝","🧟","👻","🦊","🐍","🕊️","🌑","🌕","☠️","⚡","🍂","🍁","🌸","🌿","📖","✒️","🎭","🎲",
    ],
  },
];

const RECENT_KEY = "wortwinkel:recent-symbols";

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string").slice(0, 16) : [];
  } catch {
    return [];
  }
}

export function SymbolPicker({ onPick, onClose }: { onPick: (symbol: string) => void; onClose: () => void }) {
  const [recent, setRecent] = useState<string[]>(loadRecent);
  const [group, setGroup] = useState(0);
  const groups = recent.length ? [{ name: "Zuletzt", items: recent }, ...GROUPS] : GROUPS;
  const active = groups[Math.min(group, groups.length - 1)];

  function pick(symbol: string) {
    onPick(symbol);
    const next = [symbol, ...recent.filter((r) => r !== symbol)].slice(0, 16);
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* egal */
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-surface-2 p-2" role="group" aria-label="Symbole">
      <div className="flex items-center gap-1.5">
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {groups.map((g, i) => (
            <button
              key={g.name}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setGroup(i)}
              aria-pressed={groups[Math.min(group, groups.length - 1)] === g}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                active === g ? "bg-accent-strong text-on-accent-strong" : "bg-surface text-fg-soft hover:text-fg"
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClose}
          className="shrink-0 rounded-full px-2.5 py-1 text-xs text-muted transition hover:bg-surface hover:text-fg"
        >
          Schließen
        </button>
      </div>
      <div className="grid max-h-44 grid-cols-7 gap-1 overflow-y-auto sm:grid-cols-10">
        {active.items.map((item, i) => (
          <button
            key={`${item}-${i}`}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick(item)}
            title={item}
            className={`flex h-10 items-center justify-center rounded-lg bg-surface text-lg text-fg transition hover:bg-surface-3 active:scale-90 ${
              item.length > 2 ? "col-span-3 text-sm sm:col-span-3" : ""
            }`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
