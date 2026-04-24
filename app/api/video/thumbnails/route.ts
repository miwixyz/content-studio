import Anthropic from "@anthropic-ai/sdk";
import { getSupabase } from "@/lib/supabase";
import { creatorContext } from "@/config/studio.config";


export async function POST(request: Request) {
  const supabase = getSupabase();
  const { projectId, topic, titles } = await request.json();

  if (!projectId || !topic) {
    return Response.json(
      { error: "projectId and topic are required" },
      { status: 400 }
    );
  }

  const titleContext = titles?.length
    ? `\n\nSELECTED TITLES:\n${titles.map((t: { title: string; thumbnailPairing?: string }, i: number) => `${i + 1}. "${t.title}" - Thumbnail pairing: ${t.thumbnailPairing || "not specified"}`).join("\n")}`
    : "";

  const anthropic = new Anthropic();
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `You are a YouTube thumbnail concept designer for ${creatorContext()}.

TOPIC: "${topic}"${titleContext}

THUMBNAIL RULES:
- Text on thumbnail: max 12 characters
- 3-element composition (face + text + visual element)
- Must create curiosity gap with the title
- Mobile readability (clear at small size)
- Emotional trigger (expression matters)
- High contrast, bold colors

Generate 3 thumbnail concepts as JSON:
{
  "concepts": [
    {
      "description": "Full visual description of the thumbnail",
      "textOverlay": "Short text for thumbnail (max 12 chars)",
      "expression": "What facial expression/pose",
      "background": "Background description",
      "visualElements": "Key visual elements (icons, logos, props)",
      "colorScheme": "Primary colors",
      "prompt": "Full image generation prompt for Gemini - detailed, specific, no placeholders. Include: centered chest-up person, themed background, text overlay position, style reference (YouTube thumbnail, 16:9 aspect ratio, bold and clean)",
      "ctrScore": 8,
      "rationale": "Why this concept would get clicks"
    }
  ]
}

Return ONLY valid JSON.`,
      },
    ],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  let conceptsData;
  try {
    const cleaned = responseText.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
    conceptsData = JSON.parse(cleaned);
  } catch {
    conceptsData = { concepts: [], parseError: true, raw: responseText };
  }

  const thumbnailConcepts = (conceptsData.concepts || []).map(
    (c: { description: string; prompt: string; ctrScore?: number }) => ({
      description: c.description,
      prompt: c.prompt,
      ctrScore: c.ctrScore,
    })
  );

  const { error } = await supabase
    .from("video_projects")
    .update({
      thumbnail_concepts: thumbnailConcepts,
      status: "thumbnails_done",
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ concepts: conceptsData.concepts });
}
