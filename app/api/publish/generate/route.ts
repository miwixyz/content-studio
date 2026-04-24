import Anthropic from "@anthropic-ai/sdk";
import { extractContent } from "@/lib/blotato";
import { studio, creatorContext, voiceRules } from "@/config/studio.config";

function detectSourceType(
  input: string
): { type: string; value: string } {
  if (input.match(/youtube\.com|youtu\.be/)) return { type: "youtube", value: input };
  if (input.match(/tiktok\.com/)) return { type: "tiktok", value: input };
  if (input.match(/twitter\.com|x\.com/)) return { type: "twitter", value: input };
  if (input.match(/^https?:\/\//)) return { type: "article", value: input };
  return { type: "text", value: input };
}

export async function POST(request: Request) {
  const { input, platform } = await request.json();

  if (!input || !platform) {
    return Response.json(
      { error: "input and platform are required" },
      { status: 400 }
    );
  }

  // Extract content from URL or use raw text
  let sourceContent = "";
  let sourceTitle = "";
  const source = detectSourceType(input);

  if (source.type !== "text" && process.env.BLOTATO_API_KEY) {
    try {
      const extracted = await extractContent(source.type, source.value);
      sourceContent = extracted.content;
      sourceTitle = extracted.title;
    } catch {
      // Fall back to using the URL as context
      sourceContent = `Content from: ${input}`;
      sourceTitle = input;
    }
  } else {
    sourceContent = input;
    sourceTitle = input.slice(0, 60);
  }

  const anthropic = new Anthropic();

  const platformPrompts: Record<string, string> = {
    linkedin: `Write a LinkedIn post (800-1500 chars). Professional thought-leadership, first-person. Short paragraphs with line breaks. End with a question. NO hashtags. CTA: "Watch the full breakdown on my channel - link in comments"`,
    x: `Write a single tweet, STRICTLY under 280 characters total. Casual, punchy, conversational. One strong thought. No threads. CTA: short YouTube link at end.`,
    instagram: `Write an Instagram caption (medium length). Educational, scannable format. Up to 15 hashtags in a separate block. CTA: "Link in bio" or "Full video on YouTube - link in bio"`,
    facebook: `Write a Facebook post (500-1000 chars). Approachable, community-oriented, conversational. CTA: "Watch the full breakdown here: [link]"`,
  };

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `You are writing a social media post for ${creatorContext()}.

VOICE RULES:
- ${studio.voice.tone}
${voiceRules()}
- No em dashes (--)
- Use specific numbers/stats
- Write like a real person

SOURCE CONTENT:
Title: "${sourceTitle}"
${sourceContent.slice(0, 8000)}

PLATFORM: ${platform.toUpperCase()}
${platformPrompts[platform] || "Write a compelling social media post."}

Output ONLY the post text, ready to copy-paste and publish. No explanations, no labels.`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  return Response.json({ text, sourceTitle });
}
