const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const BLOTATO_BASE = "https://backend.blotato.com/v2";

function blotatoHeaders() {
  return {
    "blotato-api-key": process.env.BLOTATO_API_KEY!,
    "Content-Type": "application/json",
  };
}

async function transcribeBuffer(buffer: Buffer): Promise<{
  transcript: string;
  words: Array<{ word: string; start: number; end: number }>;
}> {
  if (!DEEPGRAM_API_KEY) {
    return { transcript: "", words: [] };
  }

  const res = await fetch(
    "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&punctuate=true&words=true",
    {
      method: "POST",
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        "Content-Type": "audio/mp4",
      },
      body: new Uint8Array(buffer),
    }
  );

  if (!res.ok) return { transcript: "", words: [] };

  const data = await res.json();
  const words =
    data.results?.channels?.[0]?.alternatives?.[0]?.words || [];
  const transcript = words
    .map((w: { punctuated_word?: string; word: string }) =>
      w.punctuated_word || w.word
    )
    .join(" ");

  return {
    transcript,
    words: words.map(
      (w: {
        punctuated_word?: string;
        word: string;
        start: number;
        end: number;
      }) => ({
        word: w.punctuated_word || w.word,
        start: w.start,
        end: w.end,
      })
    ),
  };
}

async function uploadToBlotato(buffer: Buffer, filename: string): Promise<string> {
  // Step 1: Get presigned upload URL from Blotato
  const presignRes = await fetch(`${BLOTATO_BASE}/media/uploads`, {
    method: "POST",
    headers: blotatoHeaders(),
    body: JSON.stringify({ filename }),
  });

  if (!presignRes.ok) {
    const err = await presignRes.text();
    throw new Error(`Blotato presign failed: ${err}`);
  }

  const presignData = await presignRes.json();
  const uploadUrl = presignData.presignedUrl || presignData.uploadUrl;
  const publicUrl = presignData.publicUrl || presignData.url;

  // Step 2: Upload binary to presigned URL
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4" },
    body: new Uint8Array(buffer),
  });

  if (!uploadRes.ok) {
    throw new Error(`Blotato upload failed: ${uploadRes.status}`);
  }

  return publicUrl;
}

export const maxDuration = 120;

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Upload to Blotato CDN and transcribe in parallel
  const [videoUrl, transcription] = await Promise.all([
    uploadToBlotato(buffer, file.name).catch((err) => {
      console.error("Blotato upload error:", err);
      return null;
    }),
    transcribeBuffer(buffer).catch(() => ({
      transcript: "",
      words: [] as Array<{ word: string; start: number; end: number }>,
    })),
  ]);

  if (!videoUrl) {
    return Response.json(
      { error: "Failed to upload video to Blotato" },
      { status: 500 }
    );
  }

  return Response.json({
    videoUrl,
    transcript: transcription.transcript,
    words: transcription.words,
    filename: file.name,
    size: buffer.length,
  });
}
