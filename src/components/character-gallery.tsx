import { createClient } from "@/lib/supabase/server";
import { GalleryEditor } from "./character-gallery-editor";

// Bildergalerie eines Charakters (z. B. Alter, Stimmungen). Alle in der Welt sehen sie, die Besitzer:in pflegt sie.
export async function CharacterGallery({ characterId, canEdit }: { characterId: string; canEdit: boolean }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("character_gallery")
    .select("id, image_url, caption")
    .eq("character_id", characterId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<{ id: string; image_url: string; caption: string | null }[]>();
  const images = data ?? [];
  if (images.length === 0 && !canEdit) return null;
  return <GalleryEditor characterId={characterId} images={images} canEdit={canEdit} />;
}
