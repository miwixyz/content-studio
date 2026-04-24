# Content Studio - Setup Guide

This is a YouTube Content Studio - a full-stack dashboard for managing your entire content pipeline: research, scripting, thumbnails, publishing, repurposing, analytics, and more.

## First-Time Setup

When a user opens this project for the first time, guide them through setup step by step. Ask questions one section at a time - don't overwhelm them.

### Step 1: Creator Identity
Ask the user for:
- Their name (full name)
- YouTube channel name
- YouTube handle (e.g. @their-channel)
- Current subscriber count
- Their niche (e.g. "AI tutorials", "fitness coaching", "SaaS marketing")
- A one-line description of what they teach or create content about

Then update `config/studio.config.ts` with these values in the `creator` section.

### Step 2: Brand Voice
Ask: "How would you describe your content style? (e.g. casual and fun, professional and authoritative, enthusiastic but grounded)"

Also ask if they have any specific writing rules (things to avoid, phrases they like/dislike).

Update the `voice` section in `config/studio.config.ts`.

### Step 3: Links & CTAs
Ask: "Do you have any links you want in every video description? (e.g. your website, course, newsletter signup)"

If yes, update the `links` and `publishTemplate` sections. If no, leave them empty - the system works without them.

### Step 4: Carousel Branding
The studio can generate LinkedIn/Instagram carousel slides. Ask:
- "What brand name should appear on carousel slides?" (usually their channel name)
- "Do you want to use the current dark carousel style with accent color, or do you have your own design?"
- If they want to change the accent color, update `carousel.accentColor`

Update the `carousel` section in `config/studio.config.ts`.

### Step 5: Headshot
Tell the user: "Place your headshot image at `public/assets/headshot.png`. This is used for carousel slides and thumbnail generation. A square photo works best (at least 500x500px)."

### Step 6: Peer Channels
Ask: "Which YouTube channels do you want to track and benchmark against? Give me their channel names and handles."

Also ask: "What's your own channel handle?" (to include with `isOwn: true`)

Update the `peers` array in `config/studio.config.ts`.

### Step 7: AI News
Ask: "The studio has a daily AI news digest. Do you want to customize what topics it focuses on and who your audience is? Or keep the defaults (AI, automation, business)?"

If they want to customize, update `newsAnalysis` in `config/studio.config.ts`.

### Step 8: Environment Variables
Guide them through setting up each service:

1. **Supabase** (required - database):
   - Go to https://supabase.com and create a free project
   - Copy the project URL and anon key from Project Settings > API
   - Go to the SQL Editor and paste the contents of `supabase-schema.sql` to create tables

2. **Anthropic API** (required - AI features):
   - Get a key at https://console.anthropic.com/settings/keys

3. **YouTube Data API** (required - analytics, research):
   - Enable at https://console.cloud.google.com/apis/library/youtube.googleapis.com
   - Create an API key in Credentials
   - Find your channel ID at https://www.youtube.com/account_advanced

4. **Gemini API** (optional - thumbnail generation):
   - Get a key at https://aistudio.google.com/apikey

5. **Deepgram** (optional - audio transcription):
   - Sign up at https://deepgram.com

6. **Blotato** (optional - social media publishing):
   - Sign up at https://blotato.com

Help them create `.env.local` from the example:
```bash
cp .env.local.example .env.local
```

Then fill in each value.

### Step 9: Install & Run
```bash
npm install
npm run dev
```

The dashboard will be available at http://localhost:3000

### Step 10: Deploy (Optional)
For deployment to Vercel:
```bash
npx vercel
```
Add all environment variables in the Vercel dashboard.

## Development Notes

- **Next.js 16** - This uses Next.js 16 which has breaking changes. Read `node_modules/next/dist/docs/` before modifying code.
- **All config is centralized** in `config/studio.config.ts` - edit this file to change branding, voice, links, etc.
- **Database schema** is in `supabase-schema.sql`
- **API routes** are in `app/api/` - they use Claude (Anthropic) for AI generation
- **Carousel slides** use html-to-image for rendering - the visual template is in `components/dashboard/carousel-slide.tsx`
