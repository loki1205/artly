export type Status =
  | "idea"
  | "approved"
  | "sketching"
  | "painting"
  | "finished"
  | "sold"
  | "archived";

export type VoteValue = "like" | "neutral" | "dislike";

export interface Ranking {
  key: "new" | "top_pick" | "strong" | "good" | "mixed" | "low";
  emoji: string;
  label: string;
  has_badge: boolean;
  score: number;
}

export interface Comment {
  id: string;
  text: string;
  author: string;
  created_at: string;
  updated_at: string | null;
}

export interface Activity {
  id: string;
  text: string;
  at: string;
}

export interface Idea {
  id: string;
  title: string;
  category_id: string | null;
  tags: string[];
  notes: string;
  status: Status;
  images: string[];
  cover: string | null;
  favorite: boolean;
  order: number;
  created_at: string;
  updated_at: string;
  deleted: boolean;
  deleted_at: string | null;
  comments: Comment[];
  activity: Activity[];
  comment_count: number;
  image_count: number;
  ranking: Ranking;
  my_vote: VoteValue | null;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  emoji: string;
  created_at: string;
}

export interface Settings {
  theme: "dark" | "light";
  sound: boolean;
  default_sort: string;
}

export interface Stats {
  total: number;
  by_status: Record<Status, number>;
  favorites: number;
  top_category_id: string | null;
  top_category_name: string | null;
  most_discussed: { id: string; title: string; comment_count: number } | null;
  recent: { id: string; title: string; updated_at: string }[];
  trash_count: number;
}
