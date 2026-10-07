import { EmojiText } from "@/components/custom-emoji-provider";

const SPOILER = /\|\|([\s\S]+?)\|\|/g;

// Chat-Text mit ||Spoilern||: der Teil zwischen den Strichen bleibt verborgen, bis man ihn anklickt.
export function SpoilerText({ text }: { text: string }) {
  if (!text.includes("||")) return <EmojiText text={text} chat />;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const match of text.matchAll(SPOILER)) {
    const start = match.index ?? 0;
    if (start > last) parts.push(<EmojiText key={`t${i++}`} text={text.slice(last, start)} chat alone={false} />);
    parts.push(
      <span key={`s${i++}`} data-type="spoiler">
        <EmojiText text={match[1]} chat alone={false} />
      </span>,
    );
    last = start + match[0].length;
  }
  if (last < text.length) parts.push(<EmojiText key={`t${i++}`} text={text.slice(last)} chat alone={false} />);
  return <>{parts}</>;
}
