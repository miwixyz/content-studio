# Content Studio - Manual Setup

A full-stack YouTube content creation dashboard built with Next.js, Supabase, and AI.

## Features

- **Video Pipeline** - Research competitors, generate scripts, titles, and thumbnail concepts
- **Thumbnail Generation** - AI-powered thumbnails with headshot compositing (Gemini)
- **Multi-Platform Publishing** - Publish to YouTube, LinkedIn, Instagram, X, Facebook via Blotato
- **Content Repurposing** - Convert long-form videos to platform-specific posts and carousels
- **Short-Form Creation** - Extract clips, generate captions for Shorts/Reels/TikTok
- **Carousel Slides** - Auto-generate branded LinkedIn/Instagram carousels
- **Analytics Dashboard** - YouTube channel stats and video performance
- **Peer Tracking** - Monitor competitor channels and their latest videos
- **AI News Digest** - Daily AI news analysis with video ideas
- **Content Calendar** - Schedule and track content across platforms

## Prerequisites

- Node.js 18+
- A Supabase account (free tier works)
- An Anthropic API key
- A YouTube Data API v3 key

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/bosar-youtube/content-studio.git
cd content-studio
npm install
```

### 2. Configure Your Studio

Edit `config/studio.config.ts` with your info:

```ts
export const studio = {
  creator: {
    name: "Your Name",
    channelName: "Your Channel",
    handle: "@your-handle",
    subscriberCount: "10K",
    niche: "your niche",
    nicheDescription: "what you teach or create",
  },
  // ... see file for all options
};
```

### 3. Set Up Environment

```bash
cp .env.local.example .env.local
```

Fill in your API keys (see .env.local.example for instructions on getting each key).

### 4. Set Up Database

1. Create a Supabase project at https://supabase.com
2. Go to SQL Editor
3. Paste and run the contents of `supabase-schema.sql`
4. Copy your project URL and anon key to `.env.local`

### 5. Add Your Headshot

Replace `public/assets/headshot.png` with your photo (square, 500x500px+).

### 6. Run

```bash
npm run dev
```

Open http://localhost:3000 (password: whatever you set in DASHBOARD_PASSWORD).

## Claude Code Setup

If you use Claude Code, just run:

```
Read the CLAUDE.md and guide me through the complete setup.
```

Claude Code will walk you through everything interactively.

## Tech Stack

- Next.js 16.2 + React 19
- Supabase (PostgreSQL)
- Anthropic Claude API (AI generation)
- Google Gemini API (image generation)
- Blotato API (social publishing)
- Tailwind CSS 4 + shadcn UI
- Recharts (analytics charts)

## Deployment

Deploy to Vercel:

```bash
npx vercel
```

Add all `.env.local` variables in the Vercel dashboard under Settings > Environment Variables.

Set the function timeout to 30s in `vercel.json` (already configured).

## Project Structure

```
config/
  studio.config.ts    # All your personal settings (edit this!)
app/
  page.tsx            # Dashboard overview
  video/              # Video creation pipeline
  thumbnails/         # Thumbnail workspace
  publishing/         # Publishing interface
  repurpose/          # Content repurposing
  shorts/             # Short-form creation
  calendar/           # Content calendar
  analytics/          # Analytics dashboard
  peers/              # Peer tracking
  news/               # AI news digest
  api/                # Backend API routes
components/
  dashboard/          # Dashboard-specific components
  layout/             # Layout (sidebar, password gate)
  ui/                 # shadcn UI components
lib/
  sources.ts          # News & peer channel sources
  supabase.ts         # Database client
  youtube-api.ts      # YouTube API wrapper
  blotato.ts          # Blotato API wrapper
```
