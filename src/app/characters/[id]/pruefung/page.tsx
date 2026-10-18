import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getWorldAdminIds } from "@/lib/npc-data";
import { getWorldChoiceLists } from "@/lib/choice-lists-data";
import { getCharacterSheet } from "@/lib/character-sheet-data";
import { listCharacterFields, type ProfileFields } from "@/lib/character-fields";
import { ReviewPanel, type ProposalView } from "./review-panel";

export const metadata = { title: "Prüfung" };

type Row = ProfileFields & { id: string; owner_id: string; world_id: string; review_status: "pending" | "approved" | "rejected"; review_note: string | null; is_npc: boolean };
type ProposalRow = { id: string; field_label: string; old_value: string; new_value: string; note: string; status: ProposalView["status"]; proposer: { username: string; nickname: string | null } | null };

// Prüfung eines Charakters: Entscheidung der Admins, Vorschläge zu Feldern und deren Antwort durch die Besitzer:in
export default async function CharacterReviewPage({ params }: PageProps<"/characters/[id]/pruefung">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: c } = await supabase
    .from("characters")
    .select("id, name, bio, house, quote, status_text, gender, choices, owner_id, world_id, review_status, review_note, is_npc")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle<Row>();
  if (!c) notFound();

  const adminIds = await getWorldAdminIds(c.world_id);
  const isAdmin = adminIds.includes(user.id);
  const isOwner = c.owner_id === user.id;
  if (!isAdmin && !isOwner) redirect(`/characters/${id}`);

  const [lists, sheet, { data: rows }] = await Promise.all([
    isAdmin ? getWorldChoiceLists(c.world_id) : Promise.resolve([]),
    isAdmin ? getCharacterSheet(id, false) : Promise.resolve(null),
    supabase
      .from("character_change_proposals")
      .select("id, field_label, old_value, new_value, note, status, proposer:profiles!character_change_proposals_proposed_by_fkey(username, nickname)")
      .eq("character_id", id)
      .order("created_at", { ascending: false })
      .limit(40)
      .returns<ProposalRow[]>(),
  ]);

  const proposals: ProposalView[] = (rows ?? []).map((p) => ({
    id: p.id,
    label: p.field_label,
    oldValue: p.old_value,
    newValue: p.new_value,
    note: p.note,
    byName: p.proposer?.nickname || p.proposer?.username || "Admin",
    status: p.status,
  }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <Link href={`/characters/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted transition hover:text-fg">
        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        {c.name}
      </Link>
      <h1 className="mb-5 font-serif text-3xl text-fg">{c.review_status === "approved" ? "Angaben" : "Prüfung"}</h1>
      <ReviewPanel
        characterId={id}
        status={c.review_status}
        reviewNote={c.review_note}
        isAdmin={isAdmin}
        isOwner={isOwner}
        fields={isAdmin ? listCharacterFields(c, lists, sheet) : []}
        proposals={proposals}
      />
    </div>
  );
}
