import { ChatList } from "./chat-list";

export default function ChatsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg:flex lg:h-dvh">
      <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-line py-6 lg:block">
        <ChatList />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
