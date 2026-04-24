import Anthropic from "@anthropic-ai/sdk";
import { fetchTranscript } from "youtube-transcript";
import { studio, creatorContext, voiceRules } from "@/config/studio.config";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function getVideoDetails(videoId: string) {
  if (!YOUTUBE_API_KEY) return null;

  const res = await fetch(
    `${YOUTUBE_API_BASE}/videos?part=snippet,statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`
  );
  const data = await res.json();
  if (!data.items?.[0]) return null;

  const video = data.items[0];
  return {
    title: video.snippet.title,
    description: video.snippet.description,
    tags: video.snippet.tags || [],
    views: parseInt(video.statistics.viewCount || "0"),
    likes: parseInt(video.statistics.likeCount || "0"),
    publishedAt: video.snippet.publishedAt,
    channelTitle: video.snippet.channelTitle,
  };
}

async function getTranscript(videoId: string): Promise<string | null> {
  try {
    const segments = await fetchTranscript(videoId);
    if (!segments || segments.length === 0) return null;
    return segments
      .map((s) => s.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .slice(0, 15000);
  } catch {
    return null;
  }
}

export const maxDuration = 120;

export async function POST(request: Request) {
  const { url, transcript: providedTranscript, platforms } = await request.json();

  if ((!url && !providedTranscript) || !platforms || platforms.length === 0) {
    return Response.json(
      { error: "URL or transcript, and at least one platform required" },
      { status: 400 }
    );
  }

  let details: { title: string; description: string; tags: string[]; views: number; likes: number; publishedAt: string; channelTitle: string } | null = null;
  let transcript: string | null = providedTranscript || null;

  if (url) {
    const videoId = extractVideoId(url);
    if (!videoId) {
      return Response.json({ error: "Invalid YouTube URL" }, { status: 400 });
    }

    // Fetch video details, and transcript only if not provided
    const [fetchedDetails, fetchedTranscript] = await Promise.all([
      getVideoDetails(videoId),
      transcript ? Promise.resolve(null) : getTranscript(videoId),
    ]);

    details = fetchedDetails;
    if (!transcript) transcript = fetchedTranscript;
  }

  if (!details && !transcript) {
    return Response.json(
      {
        error: "Could not fetch video details or transcript. Paste the transcript directly.",
      },
      { status: 500 }
    );
  }

  const anthropic = new Anthropic();

  const platformInstructions: Record<string, string> = {
    linkedin: `**LINKEDIN POST**
- 1200-1800 characters
- Professional insight angle - lead with a contrarian take or surprising lesson
- Use short paragraphs (1-2 sentences each) with line breaks between them
- End with a question to drive comments
- NO hashtags at all
- Tone: professional but not corporate, share real insights`,

    x: `**X POST (single tweet)**
- STRICTLY under 280 characters total including any link
- One strong, punchy thought
- Casual, conversational, like a real tweet
- No threads, no numbering - just one single tweet
- 0-1 hashtags max
- Tone: direct, hot takes welcome`,

    instagram: `**INSTAGRAM CAPTION**
- 500-800 characters for the caption
- Start with a hook line (first line visible before "more")
- Use emojis sparingly but strategically
- Include a clear CTA (save this, share with someone, link in bio)
- Add maximum 5 relevant hashtags in a separate block after the caption (Instagram limit is 5)
- Also suggest a carousel concept: 5-7 slide titles for a carousel post
- Tone: casual, relatable, visual-first`,

    shortform: `**SHORT-FORM VIDEO SCRIPT (YouTube Shorts / Instagram Reels / TikTok)**
- 30-60 second vertical video script
- HOOK (0-3 sec): Pattern interrupt or bold claim that stops the scroll
- BODY (3-50 sec): One clear idea, fast-paced delivery
- CTA (last 5 sec): Follow, subscribe, or comment prompt
- Include [TEXT OVERLAY: "..."] markers for on-screen text
- Include [CUT TO: description] markers for visual transitions
- Include [B-ROLL: description] markers for supplementary footage
- Pacing: 3.3-4.0 words per second
- Tone: energetic, casual, like talking to a friend
- This script will be used for YouTube Shorts, Instagram Reels, AND TikTok`,
  };

  const selectedInstructions = platforms
    .map((p: string) => platformInstructions[p])
    .filter(Boolean)
    .join("\n\n---\n\n");

  const sourceContext = transcript
    ? `VIDEO TRANSCRIPT (use this as primary source):\n${transcript}`
    : details?.description
      ? `VIDEO DESCRIPTION:\n${details.description}`
      : "";

  const videoTitle = details?.title || "Video";

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `You are a content repurposing expert for ${creatorContext()}.

IMPORTANT RULES:
- ONLY generate content for the platforms listed below. Do NOT generate content for any other platform.
- Each platform gets a UNIQUE angle - never copy-paste the same content
- Voice: ${studio.voice.tone}
${voiceRules()}
- No em dashes (--)
- Make each piece standalone - someone who hasn't seen the video should still get value
- Never mention or reference any third-party tools by name (no Blotato, no scheduling tools). Focus on the content and value, not the workflow.

SOURCE VIDEO: "${videoTitle}"
${sourceContext}

Generate repurposed content ONLY for these ${platforms.length} platform(s): ${platforms.join(", ")}. Do NOT include any other platforms.

${selectedInstructions}`,
      },
    ],
  });

  const content =
    message.content[0].type === "text" ? message.content[0].text : "";

  // Parse the response into per-platform sections
  const results: Record<string, string> = {};

  for (const platform of platforms) {
    const platformUpper = platform.toUpperCase();
    const patterns = [
      new RegExp(
        `\\*\\*${platformUpper}[^*]*\\*\\*([\\s\\S]*?)(?=\\*\\*[A-Z]|---\\s*$|$)`
      ),
      new RegExp(
        `##\\s*${platformUpper}[^\\n]*\\n([\\s\\S]*?)(?=##\\s*[A-Z]|---\\s*$|$)`
      ),
      new RegExp(
        `${platformUpper}[^\\n]*\\n([\\s\\S]*?)(?=\\*\\*[A-Z]|##\\s*[A-Z]|---\\s*$|$)`
      ),
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match?.[1]?.trim()) {
        results[platform] = match[1].trim();
        break;
      }
    }

    // Fallback: if no match, put full content under first platform
    if (!results[platform] && platforms.indexOf(platform) === 0) {
      results[platform] = content;
    }
  }

  return Response.json({
    video: {
      title: details?.title || "Video",
      views: details?.views || 0,
      likes: details?.likes || 0,
      hasTranscript: !!transcript,
    },
    results,
  });
}
