export interface CalendarItem {
  id: string;
  title: string;
  platform: Platform;
  status: ContentStatus;
  scheduled_date: string | null;
  scheduled_time: string | null;
  published_url: string | null;
  source_script_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Script {
  id: string;
  title: string;
  slug: string;
  status: ScriptStatus;
  file_path: string | null;
  word_count: number | null;
  estimated_minutes: number | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  title: string;
  platform: Platform;
  status: PostStatus;
  content: string | null;
  published_url: string | null;
  published_at: string | null;
  calendar_item_id: string | null;
  engagement_data: EngagementData | null;
  created_at: string;
}

export interface CompetitorProfile {
  id: string;
  name: string;
  platform: string;
  handle: string;
  url: string | null;
  created_at: string;
}

export interface CompetitorSnapshot {
  id: string;
  competitor_id: string;
  followers: number | null;
  posts_count: number | null;
  avg_engagement: number | null;
  top_content: string | null;
  snapshot_date: string;
  raw_data: Record<string, unknown> | null;
  created_at: string;
}

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  source_url: string | null;
  category: NewsCategory | null;
  relevance_score: number | null;
  summary: string | null;
  video_potential: boolean;
  video_angle: string | null;
  flagged: boolean;
  published_date: string | null;
  created_at: string;
}

export type VideoProjectStatus =
  | "idea"
  | "researching"
  | "researched"
  | "scripting"
  | "scripted"
  | "titles_done"
  | "thumbnails_done"
  | "complete";

export type ContentPillar =
  | "framework-adoption"
  | "build-business"
  | "tutorial"
  | "use-cases"
  | "behind-scenes";

export interface HookOption {
  type: "pattern-interrupt" | "bold-claim" | "story" | "question";
  text: string;
}

export interface TitleOption {
  title: string;
  formula: string;
  powerWords: string[];
  score: number;
  thumbnailPairing: string;
  whyItWorks: string;
}

export interface ThumbnailConcept {
  description: string;
  prompt: string;
  ctrScore?: number;
  imageUrl?: string;
}

export interface VideoProject {
  id: string;
  topic: string;
  slug: string;
  status: VideoProjectStatus;
  content_pillar: ContentPillar | null;
  target_length: number;
  research_brief: Record<string, unknown> | null;
  script: string | null;
  hook_options: HookOption[] | null;
  selected_hook: number | null;
  titles: TitleOption[] | null;
  selected_title: number | null;
  thumbnail_concepts: ThumbnailConcept[] | null;
  thumbnail_urls: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsSnapshot {
  id: string;
  platform: string;
  date: string;
  metrics: Record<string, unknown>;
  created_at: string;
}

export interface EngagementData {
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
}

export type Platform =
  | "youtube"
  | "shorts"
  | "linkedin"
  | "x"
  | "instagram"
  | "tiktok";

export type ContentStatus =
  | "idea"
  | "scripted"
  | "recorded"
  | "edited"
  | "scheduled"
  | "published";

export type ScriptStatus = "draft" | "review" | "approved" | "recorded";

export type PostStatus = "draft" | "scheduled" | "published";

export type NewsCategory = "tools" | "research" | "business";

export const PLATFORM_COLORS: Record<Platform, string> = {
  youtube: "bg-red-500/20 text-red-400 border-red-500/30",
  shorts: "bg-red-500/20 text-red-300 border-red-500/30",
  linkedin: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  x: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  instagram: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  tiktok: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

export const STATUS_COLORS: Record<ContentStatus, string> = {
  idea: "bg-zinc-500/20 text-zinc-400",
  scripted: "bg-yellow-500/20 text-yellow-400",
  recorded: "bg-orange-500/20 text-orange-400",
  edited: "bg-blue-500/20 text-blue-400",
  scheduled: "bg-purple-500/20 text-purple-400",
  published: "bg-green-500/20 text-green-400",
};
