import Anthropic from "@anthropic-ai/sdk";
import { creatorContext } from "@/config/studio.config";

export async function POST(request: Request) {
  const { topic, researchBrief, message } = await request.json();

  if (!message) {
    return Response.json(
      { error: "message is required" },
      { status: 400 }
    );
  }

  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `You are a YouTube content strategist for ${creatorContext()}.

${topic ? `TOPIC: "${topic}"` : ""}

${researchBrief ? `EXISTING RESEARCH:\n${JSON.stringify(researchBrief, null, 2)}` : "No research data yet."}

USER REQUEST: ${message}

Respond helpfully and concisely. If the user asks to elaborate on an idea, go deep with specific angles, examples, and actionable suggestions. Format your response in clear markdown. Do not use em dashes.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  return Response.json({ response: text });
}
