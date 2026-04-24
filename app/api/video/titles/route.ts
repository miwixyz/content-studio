import Anthropic from "@anthropic-ai/sdk";
import { getSupabase } from "@/lib/supabase";
import { creatorContext } from "@/config/studio.config";


export async function POST(request: Request) {
  const supabase = getSupabase();
  const { projectId, topic, researchBrief, script, customPrompt } = await request.json();

  if (!projectId || !topic) {
    return Response.json(
      { error: "projectId and topic are required" },
      { status: 400 }
    );
  }

  const competitorContext = researchBrief?.topCompetitors
    ? `\n\nCOMPETITOR TITLES WITH VIEWS:\n${researchBrief.topCompetitors
        .map((c: { title: string; views: number }) => `- "${c.title}" (${c.views.toLocaleString()} views)`)
        .join("\n")}\n\nTitle patterns that work: ${JSON.stringify(researchBrief.titlePatterns)}`
    : "";

  const scriptContext = script
    ? `\n\nSCRIPT SUMMARY (first 500 chars):\n${script.slice(0, 500)}`
    : "";

  const customContext = customPrompt
    ? `\n\nADDITIONAL INSTRUCTIONS FROM CREATOR:\n${customPrompt}`
    : "";

  const anthropic = new Anthropic();
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `You are a YouTube title optimization expert for ${creatorContext()}.

CORE PRINCIPLE: High CTR + High Retention = Algorithm Love. Titles must be clickable AND honest.

TOPIC: "${topic}"${competitorContext}${scriptContext}${customContext}

TITLE RULES:
- 70-100 characters total
- First 40 characters work standalone (mobile truncation)
- Active voice, simple words
- Contains a number OR timeframe
- Primary keyword in first 50 characters
- 1-2 power words max (Curiosity: Secret, Hidden, Real, Truth | Authority: Complete, Proven, Framework | Urgency: Now, Today, Just | Value: Free, Entire, All | Emotion: Changed, Replaced, Killed, Built)
- NEVER misleading clickbait
- NEVER em dashes

Generate 3 title options as JSON:
{
  "titles": [
    {
      "title": "The full title text",
      "formula": "What formula this uses (e.g., 'I [verb] [result]')",
      "powerWords": ["word1", "word2"],
      "score": 8.5,
      "thumbnailPairing": "What thumbnail would pair well with this title",
      "whyItWorks": "1-2 sentences explaining why this title works"
    }
  ],
  "recommended": 0
}

Return ONLY valid JSON.`,
      },
    ],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  let titlesData;
  try {
    const cleaned = responseText.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
    titlesData = JSON.parse(cleaned);
  } catch {
    titlesData = { titles: [], parseError: true, raw: responseText };
  }

  const { error } = await supabase
    .from("video_projects")
    .update({
      titles: titlesData.titles,
      selected_title: titlesData.recommended ?? 0,
      status: "titles_done",
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ titlesData });
}
