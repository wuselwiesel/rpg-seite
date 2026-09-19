import { MessageCircle } from "lucide-react";

export function ChatsEmptyPane() {
  return (
    <div className="hidden h-dvh flex-col items-center justify-center gap-3 text-center lg:flex">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-fg text-fg">
        <MessageCircle className="h-8 w-8" strokeWidth={1.5} />
      </div>
      <p className="font-serif text-2xl text-fg">Deine Nachrichten</p>
      <p className="text-sm text-muted">Wähle links einen Chat oder starte einen neuen.</p>
    </div>
  );
}
