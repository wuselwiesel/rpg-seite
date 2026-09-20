import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadBook } from "@/lib/story-book";
import { BookView } from "@/components/book-view";

export default async function ArcBookPage({ params }: PageProps<"/story/arc/[arcId]/buch">) {
  const { arcId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const book = await loadBook({ arcId });
  if (!book) notFound();
  return <BookView book={book} epubHref={`/story/arc/${arcId}/epub`} />;
}
