import Anthropic from "@anthropic-ai/sdk";
import { creatorContext } from "@/config/studio.config";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function getVideoTitle(videoId: string): Promise<string> {
  if (!YOUTUBE_API_KEY) return "";
  const res = await fetch(
    `${YOUTUBE_API_BASE}/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`
  );
  const data = await res.json();
  return data.items?.[0]?.snippet?.title || "";
}

async function getTranscript(videoId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://yt.lemnoslife.com/videos?part=transcript&id=${videoId}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const segments = data?.items?.[0]?.transcript?.content;
    if (!segments || !Array.isArray(segments)) return null;
    return segments
      .map((s: { text: string; start: number }) => `[${Math.floor(s.start / 60)}:${String(Math.floor(s.start % 60)).padStart(2, "0")}] ${s.text}`)
      .join("\n")
      .slice(0, 20000);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const { url, clipCount = 5 } = await request.json();

  if (!url) {
    return Response.json({ error: "YouTube URL required" }, { status: 400 });
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return Response.json({ error: "Invalid YouTube URL" }, { status: 400 });
  }

  const [title, transcript] = await Promise.all([
    getVideoTitle(videoId),
    getTranscript(videoId),
  ]);

  if (!transcript) {
    return Response.json(
      { error: "Could not fetch transcript for this video" },
      { status: 400 }
    );
  }

  const anthropic = new Anthropic();

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `You are extracting the best short-form clips from a long-form YouTube video for ${creatorContext()}.

VIDEO: "${title}"
TRANSCRIPT (with timestamps):
${transcript}

Extract exactly ${clipCount} clip-worthy segments. Each must be self-contained (makes sense without watching the full video).

Return ONLY valid JSON, no markdown fences:
{
  "video_title": "${title}",
  "clips": [
    {
      "title": "Clip title (scroll-stopping, max 8 words)",
      "start_time": "M:SS",
      "end_time": "M:SS",
      "duration_seconds": 45,
      "hook_potential": 8,
      "why_it_works": "One line explaining why this segment is clip-worthy",
      "script": {
        "hook": "[0-3 sec] Bold opening line that stops the scroll",
        "body": "[3-45 sec] The main content, adapted for standalone viewing. Include [TEXT OVERLAY: '...'] markers for key phrases. Include [CUT TO: description] for visual transitions.",
        "cta": "[last 5 sec] Subscribe/follow CTA"
      },
      "text_overlays": ["Key phrase 1", "Key phrase 2", "Key phrase 3"],
      "editing_notes": "Specific editing instructions: pacing, zoom effects, b-roll suggestions"
    }
  ]
}

RULES:
- hook_potential: 1-10 score. 8+ means this could go viral.
- Look for: surprising stats, contrarian takes, step-by-step moments, emotional peaks, "aha" moments
- Avoid: segments that reference "earlier in the video" or need context
- Each clip should be 30-60 seconds
- Script should be rewritten for vertical format, not just a transcript excerpt
- text_overlays: 3-5 key phrases that should appear as text on screen
- editing_notes: specific instructions for a video editor
- Sort clips by hook_potential (highest first)`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const data = JSON.parse(cleaned);
    return Response.json(data);
  } catch {
    return Response.json(
      { error: "Failed to parse clips", raw: text },
      { status: 500 }
    );
  }
}
