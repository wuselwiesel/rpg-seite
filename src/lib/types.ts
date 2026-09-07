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

export type Character = {
  id: string;
  owner_id: string;
  world_id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  sheet_url: string | null;
  created_at: string;
  worlds?: { name: string } | null;
};

export type Post = {
  id: string;
  character_id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at?: string | null;
  characters: Character | null;
  comments?: { count: number }[];
  likes?: { character_id: string }[];
  reactions?: { emoji: string; character_id: string }[];
};

export type Comment = {
  id: string;
  post_id: string;
  character_id: string;
  content: string;
  created_at: string;
  updated_at?: string | null;
  characters: Character | null;
  likes?: { character_id: string }[];
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
  roll_value?: number | null;
  roll_die?: number | null;
  roll_result?: number | null;
  roll_success?: boolean | null;
  roll_target_character_id?: string | null;
  roll_target_character?: { name: string } | null;
};

export type Chat = {
  id: string;
  name: string | null;
  is_group: boolean;
  created_by: string;
  created_at: string;
};

export type Message = {
  id: string;
  chat_id: string;
  character_id: string;
  content: string;
  created_at: string;
  updated_at?: string | null;
  characters: Character | null;
  reactions?: { emoji: string; character_id: string }[];
};

export type WikiCategory = "ort" | "npc" | "fraktion" | "sonstiges";

export type WikiPage = {
  id: string;
  world_id: string;
  category: WikiCategory;
  title: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type RelationshipType = "verbuendet" | "verfeindet" | "liiert" | "familie" | "sonstiges";

export type CharacterRelationship = {
  id: string;
  world_id: string;
  character_a_id: string;
  character_b_id: string;
  type: RelationshipType;
  label: string | null;
  created_by: string;
  created_at: string;
};

export const ACTIVE_CHARACTER_COOKIE = "active_character_id";
export const ACTIVE_WORLD_COOKIE = "active_world_id";
