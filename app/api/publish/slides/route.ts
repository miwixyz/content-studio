import Anthropic from "@anthropic-ai/sdk";
import { studio, creatorContext, voiceRules } from "@/config/studio.config";

export async function POST(request: Request) {
  const { input, slideCount = 7 } = await request.json();

  if (!input) {
    return Response.json({ error: "input is required" }, { status: 400 });
  }

  const anthropic = new Anthropic();

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `You are creating LinkedIn carousel slides for ${creatorContext()}.

VOICE: ${studio.voice.tone}. First-person. No em dashes. ${studio.voice.rules.join(". ")}.

Create exactly ${slideCount} slides for a LinkedIn carousel based on this content:

${input.slice(0, 8000)}

OUTPUT FORMAT - Return ONLY valid JSON, no markdown fences:
{
  "slides": [
    {
      "type": "hook",
      "heading": "3-5 words ONLY",
      "subheading": "max 8 words (optional)"
    },
    {
      "type": "content",
      "heading": "3-5 words ONLY",
      "body": "ONE short sentence, max 15 words",
      "callout": "max 6 words (optional)"
    },
    {
      "type": "cta",
      "heading": "3-5 words ONLY",
      "body": "Simple CTA like 'Want the system? Comment below.' - max 10 words. NO buttons."
    }
  ]
}

CRITICAL TEXT LENGTH RULES - slides will be CROPPED if text is too long:
- Headings: MAXIMUM 5 words. Shorter is better. "Build Once. Scale Forever." is perfect.
- Body: MAXIMUM 15 words. ONE sentence only. No paragraphs.
- Callout: MAXIMUM 6 words.
- Subheading: MAXIMUM 8 words.
- CTA buttons: MAXIMUM 3 words each.
- If you can say it in fewer words, DO IT. Every word must earn its place.

OTHER RULES:
- Slide 1 must be type "hook" - bold, scroll-stopping, with a specific number
- Slides 2-${slideCount - 1} are type "content" - one clear idea per slide
- Last slide must be type "cta"
- Use accent words sparingly (wrap 1-2 key words with *asterisks* for blue highlighting)
- Every heading should make sense standalone`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  try {
    // Clean potential markdown fences
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const data = JSON.parse(cleaned);
    return Response.json(data);
  } catch {
    return Response.json(
      { error: "Failed to parse slide content", raw: text },
      { status: 500 }
    );
  }
}
