import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { loadBook } from "@/lib/story-book";
import { BookView } from "@/components/book-view";

export const metadata = { title: "Alle Szenen als Buch" };

// Alle Szenen der aktiven Welt in einem Buch (die man sehen darf, egal wer sie angelegt hat)
export default async function WorldBookPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const world = await getActiveWorld(user.id);
  if (!world) redirect("/worlds");
  const book = await loadBook({ worldId: world.id });
  if (!book) notFound();
  return <BookView book={book} epubHref="/story/epub" />;
}
