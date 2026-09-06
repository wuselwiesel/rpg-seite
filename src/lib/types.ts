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
  created_at: string;
  characters: Character | null;
  comments?: { count: number }[];
};

export type Comment = {
  id: string;
  post_id: string;
  character_id: string;
  content: string;
  created_at: string;
  characters: Character | null;
};

export type StoryPost = {
  id: string;
  world_id: string;
  character_id: string;
  title: string;
  content: string;
  created_at: string;
  characters: Character | null;
  story_entries?: { count: number }[];
};

export type StoryEntry = {
  id: string;
  story_post_id: string;
  character_id: string;
  content: string;
  created_at: string;
  characters: Character | null;
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
  characters: Character | null;
};

export const ACTIVE_CHARACTER_COOKIE = "active_character_id";
export const ACTIVE_WORLD_COOKIE = "active_world_id";
