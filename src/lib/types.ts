export type Profile = {
  id: string;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type World = {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  created_by: string;
  created_at: string;
};

export type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted";
  created_at: string;
  requester?: Profile | null;
  addressee?: Profile | null;
};

export type CharacterGender = "maennlich" | "weiblich" | "divers";
export type CharacterSpecies = "mensch" | "vampir" | "werwolf";

export type Character = {
  id: string;
  owner_id: string;
  world_id: string;
  name: string;
  username?: string | null;
  theme_font?: string | null;
  theme_accent?: string | null;
  theme_bg?: string | null;
  house?: string | null;
  avatar_url: string | null;
  bio: string | null;
  sheet_url: string | null;
  gender?: CharacterGender | null;
  species?: CharacterSpecies;
  relationship_status?: CharacterRelationshipStatus | null;
  partner_character_id?: string | null;
  best_friend_character_id?: string | null;
  created_at: string;
  worlds?: { name: string } | null;
};

export type CharacterRelationshipStatus = "single" | "beziehung" | "kompliziert" | "verheiratet";

export type Post = {
  id: string;
  character_id: string;
  title: string;
  content: string;
  tags: string[];
  media_url?: string | null;
  media_type?: "image" | "video" | null;
  media_urls?: string[] | null;
  pinned?: boolean;
  publish_at?: string;
  story_post_id?: string | null;
  story_post?: { id: string; title: string } | null;
  post_tags?: { characters: { id: string; name: string; username: string | null } | null }[];
  created_at: string;
  updated_at?: string | null;
  characters: Character | null;
  comments?: { count: number }[];
  likes?: { character_id: string }[];
  reactions?: { emoji: string; character_id: string; characters?: { name: string } | null }[];
  // Zusätzliche, nicht echte Likes obendrauf – von der Besitzerin/dem Besitzer frei wählbar (Popularität je Charakter).
  bonus_likes?: number;
};

export type Comment = {
  id: string;
  post_id: string;
  character_id: string | null;
  content: string;
  parent_id?: string | null;
  created_at: string;
  updated_at?: string | null;
  characters: Character | null;
  likes?: { character_id: string }[];
  pending?: boolean;
  // Kommentar von einem frei erfundenen "Profil" statt einem echten Charakter (nur für eigene
  // Beiträge erstellbar) - für alle außer der Account-Inhaberin/dem -Inhaber nicht von echten zu
  // unterscheiden.
  fake_author_id?: string | null;
  fake_name?: string | null;
  fake_avatar_url?: string | null;
};

export type StoryArc = {
  id: string;
  world_id: string;
  name: string;
  created_by: string;
  created_at: string;
};

export type StoryPost = {
  id: string;
  world_id: string;
  character_id: string;
  arc_id: string | null;
  title: string;
  content: string;
  tags: string[];
  is_private: boolean;
  pinned: boolean;
  locked: boolean;
  archived: boolean;
  location: string | null;
  in_world_time: string | null;
  turn_character_id: string | null;
  turn_set_at: string | null;
  narrator?: boolean;
  ai_summary?: string | null;
  ai_summary_count?: number | null;
  created_at: string;
  characters: Character | null;
  story_entries?: { count: number }[];
  story_arcs?: { name: string } | null;
};

export type StoryEntry = {
  id: string;
  story_post_id: string;
  character_id: string;
  content: string;
  created_at: string;
  updated_at?: string | null;
  characters: Character | null;
  roll_label?: string | null;
  // Welcher Wert/Skill vom Charakterbogen gewürfelt wurde (z.B. "Überzeugen/Manipulieren") -
  // getrennt vom frei formulierten roll_label, damit beides erhalten bleibt.
  roll_stat_name?: string | null;
  roll_value?: number | null;
  // Erschwernis/Erleichterung, die auf den Wert angerechnet wurde (z.B. -2 oder +2).
  roll_bonus?: number | null;
  roll_die?: number | null;
  roll_result?: number | null;
  roll_success?: boolean | null;
  roll_target_character_id?: string | null;
  roll_target_character?: { name: string } | null;
  // Verbleibende Glückspunkte (aus dem Charakterbogen) für diesen Charakter in dieser Szene,
  // Stand nach diesem Wurf - null, wenn kein Glück-Wert bekannt/verknüpft ist.
  roll_luck_remaining?: number | null;
  kind?: "entry" | "narrator" | "chapter";
  chapter_title?: string | null;
  chapter_summary?: string | null;
};

export type Chat = {
  id: string;
  name: string | null;
  is_group: boolean;
  avatar_url?: string | null;
  created_by: string;
  created_at: string;
};

export type Message = {
  id: string;
  chat_id: string;
  character_id: string;
  content: string;
  image_url?: string | null;
  reply_to_id?: string | null;
  shared_post_id?: string | null;
  story_id?: string | null;
  created_at: string;
  updated_at?: string | null;
  characters: Character | null;
  reactions?: { emoji: string; character_id: string }[];
  // Nachgeladen bzw. per Embed: Antwort-Ziel, geteilter Beitrag, Story
  shared_post?: SharedPostPreview | null;
  story?: StoryPreview | null;
  pending?: boolean;
};

export type SharedPostPreview = {
  id: string;
  content: string;
  media_url: string | null;
  media_type: "image" | "video" | null;
  media_urls: string[] | null;
  characters: { name: string; username: string | null; avatar_url: string | null } | null;
};

export type StoryPreview = {
  id: string;
  image_url: string | null;
  video_url: string | null;
  bg: string | null;
  text_content: string | null;
  expires_at: string;
};

export type WikiCategory = "ort" | "npc" | "fraktion" | "sonstiges";

export type WikiPage = {
  id: string;
  world_id: string;
  category: WikiCategory;
  title: string;
  content: string;
  aliases?: string[];
  cover_image_url?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type CharacterRelationship = {
  id: string;
  world_id: string;
  character_a_id: string;
  character_b_id: string;
  type: string;
  color: string;
  label: string | null;
  category: RelationshipCategory;
  family_role: FamilyRole | null;
  created_by: string;
  created_at: string;
  updated_at?: string;
};

export type RelationshipCategory = "familie" | "liebe" | "freundschaft" | "buendnis" | "rivalitaet" | "sonstiges";
export type FamilyRole = "eltern" | "partner" | "geschwister" | "verwandt";

export type RelationshipHistoryEntry = {
  id: string;
  relationship_id: string;
  type: string;
  category: RelationshipCategory;
  color: string;
  label: string | null;
  note: string | null;
  created_at: string;
};

export const ACTIVE_CHARACTER_COOKIE = "active_character_id";
export const ACTIVE_WORLD_COOKIE = "active_world_id";

export type Story = {
  id: string;
  character_id: string;
  image_url: string | null;
  video_url: string | null;
  text_content: string | null;
  bg: string | null;
  overlays: StoryOverlay[] | null;
  audio_url: string | null;
  audio_name: string | null;
  audio_start: number | null;
  audio_length: number | null;
  stickers?: unknown;
  created_at: string;
  expires_at: string;
};

// Frei platzierbarer Text auf einer Story; x/y = Mittelpunkt in % der Bühne, size in % der Breite.
export type StoryOverlay = { id: string; t: string; x: number; y: number; size: number; color: string };

export type Highlight = {
  id: string;
  character_id: string;
  title: string;
  created_at: string;
  highlight_stories?: { position: number; stories: Story | null }[];
};

// "Redaktion": Out-of-Character-Posts/Umfragen vom Account selbst (nicht von einem Charakter).
export type RedaktionPost = {
  id: string;
  author_id: string;
  content: string;
  media_url: string | null;
  media_type: "image" | "video" | null;
  media_urls: string[] | null;
  story_post_id: string | null;
  tags: string[];
  poll_multi_select: boolean;
  poll_show_voters: boolean;
  poll_character_mode: boolean;
  poll_closes_at: string | null;
  created_at: string;
  updated_at: string | null;
  author?: Pick<Profile, "id" | "username" | "nickname" | "avatar_url"> | null;
  story_post?: { id: string; title: string } | null;
  poll_options?: RedaktionPollOption[];
  comment_count?: number;
};

export type RedaktionPollOption = {
  id: string;
  post_id: string;
  label: string;
  character_id: string | null;
  position: number;
  character?: { id: string; name: string; avatar_url: string | null } | null;
  vote_count?: number;
  voters?: { id: string; username: string; nickname: string | null }[];
};

export type RedaktionComment = {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string | null;
  author?: Pick<Profile, "id" | "username" | "nickname" | "avatar_url"> | null;
};
