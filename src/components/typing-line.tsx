// Drei hüpfende Punkte und „<Name> schreibt…“; ohne Namen nur „schreibt…“
export function TypingLine({ names, className = "" }: { names: string[]; className?: string }) {
  if (names.length === 0) return null;
  const who = names.filter(Boolean).join(", ");
  return (
    <div className={`flex items-center gap-2 text-xs text-muted ${className}`} role="status">
      <span className="flex gap-0.5">
        <span className="typing-dot" />
        <span className="typing-dot [animation-delay:150ms]" />
        <span className="typing-dot [animation-delay:300ms]" />
      </span>
      {who ? `${who} schreibt…` : "schreibt…"}
    </div>
  );
}
