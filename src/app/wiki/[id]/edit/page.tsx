import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { WikiPage } from "@/lib/types";
import { WikiForm } from "../../wiki-form";

export default async function EditWikiPagePage({ params }: PageProps<"/wiki/[id]/edit">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: page } = await supabase
    .from("wiki_pages")
    .select("*")
    .eq("id", id)
    .maybeSingle<WikiPage>();

  if (!page) notFound();

  return (
    <div className="mx-auto max-w-2xl xl:max-w-3xl 2xl:max-w-4xl px-4 py-10">
      <h1 className="mb-6 font-serif text-3xl text-fg">Eintrag bearbeiten</h1>
      <WikiForm page={page} />
    </div>
  );
}
