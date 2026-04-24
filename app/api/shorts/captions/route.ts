import Anthropic from "@anthropic-ai/sdk";
import { creatorContext } from "@/config/studio.config";

export async function POST(request: Request) {
  const { transcript, platforms } = await request.json();

  if (!transcript) {
    return Response.json(
      { error: "transcript is required" },
      { status: 400 }
    );
  }

  const anthropic = new Anthropic();

  const platformList = (platforms || ["shorts", "reels", "tiktok"]).join(", ");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `You are writing social media captions for short-form video content by ${creatorContext()}.

VIDEO TRANSCRIPT:
"${transcript.slice(0, 3000)}"

Generate captions for these platforms: ${platformList}

Return ONLY valid JSON, no markdown fences:
{
  "title": "Short, catchy title for the video (max 60 chars)",
  "platforms": {
    "shorts": {
      "title": "YouTube Shorts title (max 100 chars, engaging)",
      "description": "Short description with relevant hashtags. Max 500 chars. Include #shorts #claudecode #ai"
    },
    "reels": {
      "caption": "Instagram Reels caption. Hook first line. Max 500 chars. Maximum 5 hashtags at end (Instagram limit)."
    },
    "tiktok": {
      "caption": "TikTok caption. Casual, punchy. Max 300 chars. 3-5 hashtags."
    }
  }
}

RULES:
- Title should stop the scroll
- Each platform gets unique text, not copy-paste
- Voice: direct, no-BS, enthusiastic but grounded
- No em dashes
- Include relevant hashtags per platform conventions`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const result = JSON.parse(cleaned);
    return Response.json(result);
  } catch {
    return Response.json(
      { error: "Failed to parse captions", raw: text },
      { status: 500 }
    );
  }
}
