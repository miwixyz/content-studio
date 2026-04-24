import Anthropic from "@anthropic-ai/sdk";
import { getSupabase } from "@/lib/supabase";
import { studio, creatorContext, voiceRules } from "@/config/studio.config";


export async function POST(request: Request) {
  const supabase = getSupabase();
  const { projectId, topic, researchBrief, targetLength = 12, contentPillar, customPrompt } =
    await request.json();

  if (!projectId || !topic) {
    return Response.json(
      { error: "projectId and topic are required" },
      { status: 400 }
    );
  }

  await supabase
    .from("video_projects")
    .update({ status: "scripting", updated_at: new Date().toISOString() })
    .eq("id", projectId);

  const researchContext = researchBrief
    ? `\n\nRESEARCH BRIEF:\n- Content gaps: ${JSON.stringify(researchBrief.contentGaps)}\n- Blue ocean angle: ${researchBrief.blueOceanAngle}\n- Viewer pain points: ${JSON.stringify(researchBrief.viewerPainPoints)}\n- Viewer questions: ${JSON.stringify(researchBrief.viewerQuestions)}\n- Recommended hooks: ${JSON.stringify(researchBrief.recommendedHooks)}`
    : "";

  const pillarContext = contentPillar
    ? `\nContent pillar: ${contentPillar}`
    : "";

  const customContext = customPrompt
    ? `\n\nADDITIONAL INSTRUCTIONS FROM CREATOR:\n${customPrompt}`
    : "";

  const anthropic = new Anthropic();
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: `You are a YouTube scriptwriter for ${creatorContext()}.

VOICE RULES:
- ${studio.voice.tone}
${voiceRules()}
- NEVER use em dashes

TOPIC: "${topic}"
TARGET LENGTH: ${targetLength} minutes (~${Math.round(targetLength * 150)} words)${pillarContext}${researchContext}${customContext}

Generate the script in this JSON format:
{
  "hookOptions": [
    { "type": "pattern-interrupt", "text": "15-30 second hook script" },
    { "type": "bold-claim", "text": "15-30 second hook script" },
    { "type": "story", "text": "15-30 second hook script" },
    { "type": "question", "text": "15-30 second hook script" }
  ],
  "recommendedHook": 0,
  "script": "Full script with [TIMESTAMP HH:MM], [B-ROLL: description], [SCREEN: description], [DIAGRAM: description], [RE-HOOK: teaser], [CTA: action], [PAUSE], [ENERGY: up/down] markers. Include retention re-hooks every 2-3 minutes.${studio.publishTemplate.pinnedCommentCTA ? " End with natural CTA." : ""}",
  "diagramRequests": ["Diagram 1 description", "Diagram 2 description"],
  "brollList": ["B-roll shot 1", "B-roll shot 2"],
  "wordCount": 0,
  "estimatedMinutes": 0
}

Return ONLY valid JSON. The script field should be the complete, publish-ready script text with all markers embedded.`,
      },
    ],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  let scriptData;
  try {
    const cleaned = responseText.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
    scriptData = JSON.parse(cleaned);
  } catch {
    scriptData = {
      hookOptions: [],
      script: responseText,
      wordCount: responseText.split(/\s+/).length,
      estimatedMinutes: Math.round(responseText.split(/\s+/).length / 150),
    };
  }

  const { error } = await supabase
    .from("video_projects")
    .update({
      script: scriptData.script,
      hook_options: scriptData.hookOptions,
      selected_hook: scriptData.recommendedHook ?? 0,
      status: "scripted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ scriptData });
}
