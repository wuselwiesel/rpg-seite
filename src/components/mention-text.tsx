import Link from "next/link";
import { parseMentions } from "@/lib/mentions";

export function MentionText({ text, className }: { text: string; className?: string }) {
  const segments = parseMentions(text);

  return (
    <p className={className}>
      {segments.map((segment, index) =>
        segment.type === "mention" ? (
          <Link
            key={index}
            href={`/characters/${segment.characterId}`}
            className="font-medium text-accent hover:underline"
          >
            @{segment.name}
          </Link>
        ) : (
          <span key={index}>{segment.value}</span>
        ),
      )}
    </p>
  );
}
