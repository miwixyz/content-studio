import { NEWS_YOUTUBE_CHANNELS } from "@/lib/sources";
import { getChannelInfo, getLatestVideos } from "@/lib/youtube-api";
import { getSupabase } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";
import { studio, creatorContext } from "@/config/studio.config";


interface RawItem {
  title: string;
  source: string;
  url: string;
  date: string;
  summary?: string;
}

async function fetchYouTubeNews(): Promise<RawItem[]> {
  if (!process.env.YOUTUBE_API_KEY) return [];
  const items: RawItem[] = [];

  for (const channel of NEWS_YOUTUBE_CHANNELS) {
    try {
      const handle = channel.handle.replace("@", "");
      const info = await getChannelInfo(handle);
      if (!info) continue;
      const videos = await getLatestVideos(info.channelId, 3);
      for (const video of videos) {
        items.push({
          title: video.title,
          source: `${channel.name} (YouTube)`,
          url: video.url,
          date: video.publishedAt.split("T")[0],
        });
      }
    } catch {
      // Skip failed channels
    }
  }
  return items;
}

async function fetchRSS(feedUrl: string, sourceName: string): Promise<RawItem[]> {
  try {
    const res = await fetch(feedUrl);
    if (!res.ok) return [];
    const text = await res.text();

    const items: RawItem[] = [];
    // Simple XML parsing for RSS items
    const itemMatches = text.match(/<item>[\s\S]*?<\/item>/g) || [];
    for (const item of itemMatches.slice(0, 5)) {
      const title = item.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)?.[1] || "";
      const link = item.match(/<link>(.*?)<\/link>/)?.[1] || "";
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
      const description = item.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)?.[1] || "";

      if (title) {
        items.push({
          title: title.replace(/<[^>]*>/g, "").trim(),
          source: sourceName,
          url: link.trim(),
          date: pubDate ? new Date(pubDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          summary: description.replace(/<[^>]*>/g, "").trim().slice(0, 200),
        });
      }
    }
    return items;
  } catch {
    return [];
  }
}

async function fetchHackerNews(): Promise<RawItem[]> {
  try {
    const res = await fetch(
      "https://hn.algolia.com/api/v1/search?query=Claude+OR+Anthropic+OR+%22AI+agent%22+OR+Gemini+OR+OpenAI&tags=story&hitsPerPage=10"
    );
    const data = await res.json();
    return (data.hits || [])
      .filter((hit: { title: string | null }) => hit.title)
      .map((hit: { title: string; url: string; created_at: string; objectID: string }) => ({
        title: hit.title,
        source: "Hacker News",
        url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
        date: hit.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
      }));
  } catch {
    return [];
  }
}

export async function POST() {
  const supabase = getSupabase();
  // Fetch from all free sources in parallel
  const [ytNews, anthropicBlog, openAiBlog, googleBlog, hnNews] =
    await Promise.all([
      fetchYouTubeNews(),
      fetchRSS("https://www.anthropic.com/rss.xml", "Anthropic Blog"),
      fetchRSS("https://openai.com/blog/rss.xml", "OpenAI Blog"),
      fetchRSS("https://blog.google/technology/ai/rss/", "Google AI Blog"),
      fetchHackerNews(),
    ]);

  const allItems = [...ytNews, ...anthropicBlog, ...openAiBlog, ...googleBlog, ...hnNews];

  if (allItems.length === 0) {
    return Response.json({ error: "No items fetched from any source" }, { status: 500 });
  }

  // Send to Claude for analysis and digest
  const anthropic = new Anthropic();
  const itemsList = allItems
    .map((item) => `- [${item.source}] "${item.title}" (${item.date}) ${item.url}${item.summary ? "\n  " + item.summary : ""}`)
    .join("\n");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `You are an AI news analyst for ${creatorContext()}. You provide actionable insights, not generic news.

Here are today's items from tracked sources:

${itemsList}

Generate a daily AI digest. Focus on what's ACTIONABLE - new features, tools, updates that ${studio.newsAnalysis.audienceDescription} would care about. Focus areas: ${studio.newsAnalysis.focusTopics.join(", ")}.

Return ONLY valid JSON, no markdown fences:
{
  "date": "${new Date().toISOString().split("T")[0]}",
  "top_insight": {
    "title": "Most important actionable insight (one line)",
    "body": "2-3 sentences explaining why this matters and what to do about it",
    "source_url": "URL to the source"
  },
  "key_updates": [
    {
      "title": "Short update title",
      "body": "One sentence summary",
      "source_url": "URL"
    }
  ],
  "video_ideas": [
    {
      "title": "Potential video topic based on today's news",
      "angle": "Why this would make a good video"
    }
  ],
  "summary": "2-3 sentence overall summary of what happened in AI today"
}

RULES:
- top_insight: THE single most important thing. Must be specific and actionable.
- key_updates: 3-5 items max. Skip anything generic or not relevant to AI builders/business.
- video_ideas: 1-3 content ideas derived from today's news
- If nothing significant happened, say so honestly
- No em dashes`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const digest = JSON.parse(cleaned);

    // Store digest in Supabase
    await supabase.from("news_items").insert({
      headline: `AI Digest - ${digest.date}`,
      source: "AI Digest",
      source_url: null,
      category: "digest",
      relevance_score: 10,
      summary: JSON.stringify(digest),
      published_date: digest.date,
    });

    return Response.json({ digest });
  } catch {
    return Response.json({ error: "Failed to parse digest", raw: text }, { status: 500 });
  }
}
