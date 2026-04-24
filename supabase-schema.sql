-- Content Creation Dashboard - Supabase Schema
-- Run this in Supabase SQL Editor to create all tables

-- Scripts metadata (content stored in file system)
create table if not exists scripts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  status text not null default 'draft',
  file_path text,
  word_count int,
  estimated_minutes numeric(4,1),
  tags text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Content calendar items
create table if not exists calendar_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  platform text not null,
  status text not null default 'idea',
  scheduled_date date,
  scheduled_time time,
  published_url text,
  source_script_id uuid references scripts(id),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Posts tracking
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  platform text not null,
  status text not null default 'draft',
  content text,
  published_url text,
  published_at timestamptz,
  calendar_item_id uuid references calendar_items(id),
  engagement_data jsonb,
  created_at timestamptz default now()
);

-- Competitor profiles
create table if not exists competitor_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  platform text not null,
  handle text not null,
  url text,
  created_at timestamptz default now()
);

-- Competitor snapshots (weekly data points)
create table if not exists competitor_snapshots (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid references competitor_profiles(id) on delete cascade,
  followers int,
  posts_count int,
  avg_engagement numeric,
  top_content text,
  snapshot_date date not null,
  raw_data jsonb,
  created_at timestamptz default now()
);

-- AI news items
create table if not exists news_items (
  id uuid primary key default gen_random_uuid(),
  headline text not null,
  source text not null,
  source_url text,
  category text,
  relevance_score int,
  summary text,
  video_potential boolean default false,
  video_angle text,
  flagged boolean default false,
  published_date date,
  created_at timestamptz default now()
);

-- Analytics snapshots (cached platform data)
create table if not exists analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  date date not null,
  metrics jsonb not null,
  created_at timestamptz default now()
);

-- Video projects (full pipeline tracking)
create table if not exists video_projects (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  slug text unique not null,
  status text not null default 'idea',
  content_pillar text,
  target_length numeric(4,1) default 12,
  research_brief jsonb,
  script text,
  hook_options jsonb,
  selected_hook int,
  titles jsonb,
  selected_title int,
  thumbnail_concepts jsonb,
  thumbnail_urls text[],
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security (allow all for now, tighten later)
alter table scripts enable row level security;
alter table calendar_items enable row level security;
alter table posts enable row level security;
alter table competitor_profiles enable row level security;
alter table competitor_snapshots enable row level security;
alter table news_items enable row level security;
alter table analytics_snapshots enable row level security;
alter table video_projects enable row level security;

-- Permissive policies (dashboard is password-gated, not multi-user)
create policy "Allow all on scripts" on scripts for all using (true) with check (true);
create policy "Allow all on calendar_items" on calendar_items for all using (true) with check (true);
create policy "Allow all on posts" on posts for all using (true) with check (true);
create policy "Allow all on competitor_profiles" on competitor_profiles for all using (true) with check (true);
create policy "Allow all on competitor_snapshots" on competitor_snapshots for all using (true) with check (true);
create policy "Allow all on news_items" on news_items for all using (true) with check (true);
create policy "Allow all on analytics_snapshots" on analytics_snapshots for all using (true) with check (true);
create policy "Allow all on video_projects" on video_projects for all using (true) with check (true);
