import { GoogleGenAI } from "@google/genai";
import { readFileSync } from "fs";
import { join } from "path";

import { studio } from "@/config/studio.config";

const HEADSHOT_PATH = join(
  process.cwd(),
  "public",
  studio.carousel.headshot.replace(/^\//, "")
);

export const maxDuration = 120;

export async function POST(request: Request) {
  const formData = await request.formData();
  const prompt = formData.get("prompt") as string | null;
  const referenceFile = formData.get("reference") as File | null;
  const count = parseInt((formData.get("count") as string) || "4", 10);
  const includeHeadshot = formData.get("includeHeadshot") === "true";

  if (!prompt && !referenceFile) {
    return Response.json(
      { error: "Provide a text prompt, a reference image, or both" },
      { status: 400 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 500 }
    );
  }

  const genai = new GoogleGenAI({ apiKey });

  // Load headshot only if requested
  let headshotBase64: string | null = null;
  if (includeHeadshot) {
    try {
      const headshotBuffer = readFileSync(HEADSHOT_PATH);
      headshotBase64 = headshotBuffer.toString("base64");
    } catch {
      return Response.json(
        { error: "Could not load headshot image" },
        { status: 500 }
      );
    }
  }

  // Load reference image if provided
  let referenceBase64: string | null = null;
  let referenceMime: string | null = null;
  if (referenceFile) {
    const refBuffer = Buffer.from(await referenceFile.arrayBuffer());
    referenceBase64 = refBuffer.toString("base64");
    referenceMime = referenceFile.type || "image/png";
  }

  // Generate thumbnails in parallel
  const generateOne = async (index: number) => {
    // Build prompt matching the skill's template structure
    const promptParts: string[] = [];

    promptParts.push(
      `A professional YouTube video thumbnail in 16:9 aspect ratio.`
    );

    // Describe attached images (headshot always Image 1 if provided)
    const imageDescriptions: string[] = [];
    let imageIndex = 1;

    if (headshotBase64) {
      imageDescriptions.push(
        `- Image ${imageIndex} (HEADSHOT - MANDATORY): This is the EXACT face of the person who must appear in the thumbnail. You MUST use this person's exact facial features, hair, and likeness. Do NOT generate a different face. Do NOT use AI-generated or stock faces. The person in the thumbnail must be recognizably the same person as in this reference photo - same face shape, same hair, same ethnicity, same features.`
      );
      imageIndex++;
    }

    if (referenceBase64) {
      imageDescriptions.push(
        `- Image ${imageIndex} (STYLE REFERENCE): This is a REFERENCE THUMBNAIL showing the design style. Match its layout, composition, color palette, text placement, and overall design language. But the FACE in the final thumbnail must be the person from Image 1, NOT any face in this reference.`
      );
      imageIndex++;
    }

    if (imageDescriptions.length > 0) {
      promptParts.push(`\nATTACHED IMAGES:\n${imageDescriptions.join("\n")}`);
    }

    // User's concept/prompt
    if (prompt) {
      promptParts.push(`\nCONCEPT:\n${prompt}`);
    }

    // Person section - only if headshot included
    if (headshotBase64) {
      promptParts.push(
        `\nPERSON (CRITICAL):\nThe person in the thumbnail MUST be the exact same person shown in Image 1 (the headshot). Preserve their exact facial features, hair, ethnicity, and likeness. Do not replace with a generic or AI-generated face. Place them on the right side of the frame, taking up approximately 40% of the width. Show them from the waist up or shoulders up. Natural skin tones. No color tinting, no xenon/neon lighting on skin.`
      );
    }

    // Background - only if no reference (reference dictates everything)
    if (!referenceBase64) {
      promptParts.push(
        `\nBACKGROUND:\nDark, moody, cinematic background - NOT a solid black void. Use a darkened real-world scene or environment relevant to the video topic. The scene should feel like dramatic night photography or heavy cinematic color grading - dark overall but with real environmental detail, texture, and depth. No glow effects. No bright or white backgrounds, and never a flat solid-color void.`
      );
    }

    // Text rules - only if no reference
    if (!referenceBase64) {
      promptParts.push(
        `\nTEXT RULES:\n- Maximum 3-5 words on the thumbnail. Fewer is better.\n- Must be readable at small sizes (320x180px).\n- Bold, heavy, modern sans-serif font.\n- White text against dark background. Use accent color only for a single emphasized word.\n- Do NOT overlap text with the person's face.\n- Never place important elements in the bottom-right corner (YouTube timestamp overlay).`
      );
    }

    // Style - only if no reference
    if (!referenceBase64) {
      promptParts.push(
        `\nSTYLE:\nProfessional, high-contrast, clean design. Similar to top YouTube tech/business channel thumbnails. Dramatic lighting on the person (if included). Subtle depth with layered elements. Polished and modern - not cluttered. Natural skin tones. No neon/xenon glow effects on faces.`
      );
    }

    // Variation instruction
    promptParts.push(
      `\nVariation ${index + 1} of ${count} - make this variation unique in composition, color scheme, and text placement.`
    );

    const promptText = promptParts.join("\n");

    // Build contents array: text first, then images in described order
    const contents: Array<
      | { text: string }
      | { inlineData: { data: string; mimeType: string } }
    > = [{ text: promptText }];

    if (headshotBase64) {
      contents.push({
        inlineData: { data: headshotBase64, mimeType: "image/png" },
      });
    }

    if (referenceBase64 && referenceMime) {
      contents.push({
        inlineData: { data: referenceBase64, mimeType: referenceMime },
      });
    }

    const response = await genai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: [{ role: "user", parts: contents }],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: { aspectRatio: "16:9" },
      },
    });

    // Extract image from response
    const parts = response.candidates?.[0]?.content?.parts || [];
    let imageData: string | null = null;
    let notes = "";

    for (const part of parts) {
      if (part.inlineData?.data) {
        imageData = part.inlineData.data;
      } else if (part.text) {
        notes += part.text;
      }
    }

    if (!imageData) {
      return { error: `Variation ${index + 1}: No image generated`, notes };
    }

    return {
      imageUrl: `data:image/png;base64,${imageData}`,
      notes: notes || null,
      index: index + 1,
    };
  };

  try {
    const results = await Promise.allSettled(
      Array.from({ length: count }, (_, i) => generateOne(i))
    );

    const thumbnails = results.map((r, i) => {
      if (r.status === "fulfilled") return r.value;
      return { error: `Variation ${i + 1} failed: ${r.reason}`, index: i + 1 };
    });

    return Response.json({ thumbnails });
  } catch (err) {
    return Response.json(
      { error: `Generation failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
