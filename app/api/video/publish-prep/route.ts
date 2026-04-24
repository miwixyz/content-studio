import Anthropic from "@anthropic-ai/sdk";
import { studio, creatorContext } from "@/config/studio.config";

export async function POST(request: Request) {
  const { transcript, videoTitle } = await request.json();

  if (!transcript?.trim()) {
    return Response.json(
      { error: "Transcript is required" },
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
        content: `You are a YouTube publishing assistant for ${creatorContext()}.

Given a video transcript with timestamps, generate all YouTube publishing assets.

VIDEO TITLE (if provided): "${videoTitle || "not provided"}"

TRANSCRIPT:
${transcript.slice(0, 30000)}

Generate a JSON response with this EXACT structure:

{
  "description": "Full YouTube video description.${studio.publishTemplate.descriptionHeader ? ` Start with:\\n\\n${studio.publishTemplate.descriptionHeader}\\n\\n` : " "}[2-3 sentence summary of what the video covers and what the viewer will learn. Written in first person as ${studio.creator.channelName}.]\\n\\nTools mentioned in the video:\\n[List each tool with a link if mentioned, or just the name if no link]\\n\\nTimestamps\\n[Extract ALL timestamps from the transcript in format: MM:SS - Section Title]",

  "tags": "Comma-separated SEO tags, EXACTLY 500 characters total. Include: topic keywords, tool names, related search terms, long-tail keywords. Focus on what people would search to find this video.",

  "promises": ["List of specific things promised or mentioned in the video that should be included in the description - like resources, links, tools, downloads, references to other videos, discounts, etc."],

  "pinnedComment": "${studio.publishTemplate.pinnedCommentCTA ? `First pinned comment as a CTA. ${studio.publishTemplate.pinnedCommentCTA} Make it feel natural, not salesy - tie it to the specific value shown in the video.` : "A pinned comment that adds value or starts a discussion related to the video topic."}"
}

CRITICAL RULES:${studio.publishTemplate.descriptionHeader ? "\n- The description MUST start with the CTA links block" : ""}
- Timestamps MUST be extracted from the transcript (they appear as MM:SS at the start of paragraphs or as section headers)
- Timestamp chapter titles MUST be 2-4 words only. Keep them short and punchy. Never longer than 4 words.
- CHAPTER COUNT IS CRITICAL - keep it LOW. Target 7-8 chapters for a 20-minute video, 5-6 for a 10-minute video. Scale proportionally. Roughly 1 chapter per 3 minutes. Never exceed 10 chapters. Never put two chapters within 2 minutes of each other.
- Tags must be EXACTLY 500 characters (count carefully, pad or trim to hit 500)
- Never use em dashes anywhere
- NEVER use angled brackets < or > anywhere in any output. YouTube rejects them. Use colons or dashes instead.
- The pinned comment should reference specific value from THIS video
- Tools section: list EVERY tool, service, or platform mentioned in the video
- Promises list: scan for any "I'll show you", "check out", "link in description", "use my link", discount codes, referenced videos, etc.

Return ONLY valid JSON, no markdown formatting.`,
      },
    ],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  let result;
  try {
    const cleaned = responseText
      .replace(/```json?\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    result = JSON.parse(cleaned);
  } catch {
    // If JSON parsing fails, try to extract sections
    result = {
      description: responseText,
      tags: "",
      promises: [],
      pinnedComment: "",
      parseError: true,
    };
  }

  return Response.json({ result });
}
