const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent";

interface SlideInput {
  heading: string;
  body?: string;
  callout?: string;
  type: string;
}

export async function POST(request: Request) {
  if (!GEMINI_API_KEY) {
    return Response.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 500 }
    );
  }

  const { slides } = (await request.json()) as { slides: SlideInput[] };

  if (!slides?.length) {
    return Response.json({ error: "No slides provided" }, { status: 400 });
  }

  const imageUrls: (string | null)[] = [];

  for (const slide of slides) {
    const concept = [slide.heading, slide.body, slide.callout]
      .filter(Boolean)
      .join(". ");

    try {
      const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Create an abstract dark background texture for a carousel slide about: "${concept}"

RULES:
- Dark navy background #060B18
- 4:5 portrait aspect ratio
- NO logos, NO icons, NO recognizable objects, NO text
- ABSTRACT ONLY - subtle geometric shapes, soft gradients, faint light trails
- Keep the center of the image very dark and clean (text goes there)
- Decorative elements only in corners and edges, very faint
- Maximum 15-20% opacity for any visual element
- Think: dark premium wallpaper with a hint of depth
- Accent color: #4F6AFF blue, used very sparingly as faint glows
- Mood should subtly match the topic (warm for business, cool for tech, neutral for general)
- Extremely minimal - less is more`,
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
            imageConfig: {
              aspectRatio: "4:5",
            },
          },
        }),
      });

      if (!res.ok) {
        console.error(`Gemini error for slide "${slide.heading}": ${res.status}`);
        imageUrls.push(null);
        continue;
      }

      const data = await res.json();
      const parts = data.candidates?.[0]?.content?.parts || [];

      let imageData: string | null = null;
      for (const part of parts) {
        if (part.inlineData?.data) {
          imageData = part.inlineData.data;
          break;
        }
      }

      if (imageData) {
        const imgBuffer = Buffer.from(imageData, "base64");
        const blob = new Blob([imgBuffer], { type: "image/png" });
        const formData = new FormData();
        formData.append("reqtype", "fileupload");
        formData.append("fileToUpload", blob, "slide-bg.png");

        const uploadRes = await fetch("https://catbox.moe/user/api.php", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          imageUrls.push((await uploadRes.text()).trim());
        } else {
          imageUrls.push(null);
        }
      } else {
        imageUrls.push(null);
      }
    } catch (err) {
      console.error("Visual generation error:", err);
      imageUrls.push(null);
    }
  }

  return Response.json({ imageUrls });
}
