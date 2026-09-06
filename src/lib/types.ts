export type Profile = {
  id: string;
  username: string;
  created_at: string;
};

export type Character = {
  id: string;
  owner_id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
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
