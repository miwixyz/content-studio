const BLOTATO_BASE = "https://backend.blotato.com/v2";

function blotatoHeaders() {
  return {
    "blotato-api-key": process.env.BLOTATO_API_KEY!,
    "Content-Type": "application/json",
  };
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Get presigned upload URL from Blotato
  const presignRes = await fetch(`${BLOTATO_BASE}/media/uploads`, {
    method: "POST",
    headers: blotatoHeaders(),
    body: JSON.stringify({ filename: file.name }),
  });

  if (!presignRes.ok) {
    const err = await presignRes.text();
    return Response.json(
      { error: `Blotato presign failed: ${err}` },
      { status: 500 }
    );
  }

  const presignData = await presignRes.json();
  const uploadUrl = presignData.presignedUrl || presignData.uploadUrl;
  const publicUrl = presignData.publicUrl || presignData.url;

  // Upload binary to presigned URL
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "image/png" },
    body: buffer,
  });

  if (!uploadRes.ok) {
    return Response.json(
      { error: `Upload failed: ${uploadRes.status}` },
      { status: 500 }
    );
  }

  return Response.json({ url: publicUrl });
}
