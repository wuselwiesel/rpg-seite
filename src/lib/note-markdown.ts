import { marked } from "marked";

// Notiz (bereinigtes HTML) als Markdown-Text, für den Export und die Quelltext-Ansicht. Bewusst klein gehalten: nur, was Notizen enthalten können.

type El = { tag: string; attrs: Record<string, string>; children: Node[] };
type Node = El | string;

const VOID = new Set(["br", "hr", "img", "input"]);

function decode(s: string): string {
  return s.replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
}

function parse(html: string): El {
  const root: El = { tag: "root", attrs: {}, children: [] };
  const stack: El[] = [root];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^<>]*?)?)\s*(\/?)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const top = stack[stack.length - 1];
    if (m[5] !== undefined) {
      top.children.push(decode(m[5]));
      continue;
    }
    const tag = m[2].toLowerCase();
    if (m[1]) {
      const i = stack.map((e) => e.tag).lastIndexOf(tag);
      if (i > 0) stack.length = i;
      continue;
    }
    const attrs: Record<string, string> = {};
    for (const a of m[3].matchAll(/([a-zA-Z-]+)(?:="([^"]*)")?/g)) attrs[a[1].toLowerCase()] = decode(a[2] ?? "");
    const el: El = { tag, attrs, children: [] };
    top.children.push(el);
    if (!VOID.has(tag) && !m[4]) stack.push(el);
  }
  return root;
}

const text = (n: Node): string => (typeof n === "string" ? n : n.children.map(text).join(""));

function inline(nodes: Node[]): string {
  return nodes
    .map((n) => {
      if (typeof n === "string") return n.replace(/\s+/g, " ");
      switch (n.tag) {
        case "strong":
        case "b":
          return `**${inline(n.children)}**`;
        case "em":
        case "i":
          return `*${inline(n.children)}*`;
        case "s":
          return `~~${inline(n.children)}~~`;
        case "mark":
          return `==${inline(n.children)}==`;
        case "code":
          return `\`${text(n)}\``;
        case "br":
          return "  \n";
        case "a":
          return n.attrs.href ? `[${inline(n.children)}](${n.attrs.href})` : inline(n.children);
        case "img":
          return n.attrs.src ? `![](${n.attrs.src})` : "";
        case "label":
        case "input":
          return "";
        default:
          return inline(n.children);
      }
    })
    .join("");
}

function table(el: El): string {
  const rows: string[][] = [];
  const walk = (e: El) => {
    for (const c of e.children) {
      if (typeof c === "string") continue;
      if (c.tag === "tr") rows.push(c.children.filter((x): x is El => typeof x !== "string" && (x.tag === "td" || x.tag === "th")).map((cell) => inline(cell.children).replace(/\|/g, "\\|").replace(/\s+/g, " ").trim()));
      else walk(c);
    }
  };
  walk(el);
  if (rows.length === 0) return "";
  const width = Math.max(...rows.map((r) => r.length));
  const pad = (r: string[]) => `| ${[...r, ...Array(width - r.length).fill("")].join(" | ")} |`;
  return [pad(rows[0]), `| ${Array(width).fill("---").join(" | ")} |`, ...rows.slice(1).map(pad)].join("\n");
}

function list(el: El, ordered: boolean, depth: number): string {
  let n = 0;
  const lines: string[] = [];
  for (const item of el.children) {
    if (typeof item === "string" || item.tag !== "li") continue;
    n++;
    const task = item.attrs["data-type"] === "taskItem";
    const marker = task ? `- [${item.attrs["data-checked"] === "true" ? "x" : " "}]` : ordered ? `${n}.` : "-";
    const inlineParts: Node[] = [];
    const nested: string[] = [];
    const collect = (nodes: Node[]) => {
      for (const c of nodes) {
        if (typeof c === "string") inlineParts.push(c);
        else if (c.tag === "ul" || c.tag === "ol") nested.push(list(c, c.tag === "ol", depth + 1));
        else if (c.tag === "p" || c.tag === "div") {
          if (inlineParts.length) inlineParts.push(" ");
          collect(c.children);
        } else if (c.tag !== "label") inlineParts.push(c);
      }
    };
    collect(item.children);
    lines.push(`${"  ".repeat(depth)}${marker} ${inline(inlineParts).trim()}`);
    lines.push(...nested);
  }
  return lines.join("\n");
}

function block(nodes: Node[]): string[] {
  const out: string[] = [];
  let loose: Node[] = [];
  const flush = () => {
    const t = inline(loose).trim();
    if (t) out.push(t);
    loose = [];
  };
  for (const n of nodes) {
    if (typeof n === "string" || ["strong", "b", "em", "i", "s", "code", "a", "img", "br", "span", "u", "mark"].includes(n.tag)) {
      loose.push(n);
      continue;
    }
    flush();
    switch (n.tag) {
      case "h1":
        out.push(`# ${inline(n.children).trim()}`);
        break;
      case "h2":
        out.push(`## ${inline(n.children).trim()}`);
        break;
      case "h3":
        out.push(`### ${inline(n.children).trim()}`);
        break;
      case "p": {
        const t = inline(n.children).trim();
        if (t) out.push(t);
        break;
      }
      case "ul":
      case "ol":
        out.push(list(n, n.tag === "ol", 0));
        break;
      case "blockquote":
        out.push(block(n.children).join("\n\n").split("\n").map((l) => `> ${l}`.trimEnd()).join("\n"));
        break;
      case "pre":
        out.push("```\n" + text(n).replace(/\n$/, "") + "\n```");
        break;
      case "hr":
        out.push("---");
        break;
      case "table":
        out.push(table(n));
        break;
      case "summary":
        out.push(`**${inline(n.children).trim()}**`);
        break;
      default:
        out.push(...block(n.children));
    }
  }
  flush();
  return out.filter(Boolean);
}

export function noteToMarkdown(html: string): string {
  return block(parse(html).children).join("\n\n") + "\n";
}

export function noteDocument(n: { title: string; body: string; tags: string[] }, fallbackTitle = "Ohne Titel"): string {
  const head = `# ${n.title.trim() || fallbackTitle}`;
  const tags = n.tags.length ? `\n\n${n.tags.map((t) => `#${t}`).join(" ")}` : "";
  return `${head}${tags}\n\n${noteToMarkdown(n.body)}`;
}

// Markdown-Text als HTML für den Editor (Überschriften, Listen, Aufgaben `- [ ]`, Tabellen, Code, ==Markierung==). Das Ergebnis wird danach wie jeder Text bereinigt.
export function markdownToHtml(md: string): string {
  let html = marked.parse(md, { async: false, gfm: true, breaks: false }) as string;
  // Aufgabenlisten: <li><input type="checkbox" …> Text</li> → Tiptap-Struktur
  html = html.replace(/<ul>((?:(?!<\/ul>)[\s\S])*?<li>\s*<input[^>]*type="checkbox"[\s\S]*?)<\/ul>/g, (whole, inner: string) => {
    const items = [...inner.matchAll(/<li>\s*<input([^>]*)>\s*([\s\S]*?)<\/li>/g)];
    if (items.length === 0) return whole;
    const lis = items
      .map((m) => {
        const checked = /\bchecked\b/.test(m[1]);
        const text = m[2].replace(/^<p>|<\/p>$/g, "").trim();
        return `<li data-type="taskItem" data-checked="${checked}"><label><input type="checkbox"${checked ? ' checked="checked"' : ""} /><span></span></label><div><p>${text}</p></div></li>`;
      })
      .join("");
    return `<ul data-type="taskList">${lis}</ul>`;
  });
  // ==Markierung== außerhalb von Code
  html = html
    .split(/(<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>|<[^>]+>)/g)
    .map((seg) => (seg.startsWith("<") ? seg : seg.replace(/==([^=\n]+)==/g, "<mark>$1</mark>")))
    .join("");
  return html;
}
