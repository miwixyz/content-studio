import { publishPost } from "@/lib/blotato";

export async function POST(request: Request) {
  if (!process.env.BLOTATO_API_KEY) {
    return Response.json(
      { error: "BLOTATO_API_KEY not configured" },
      { status: 500 }
    );
  }

  const { accountId, text, platform, mediaUrls, pageId, scheduledTime, title } =
    await request.json();

  if (!accountId || !text || !platform) {
    return Response.json(
      { error: "accountId, text, and platform are required" },
      { status: 400 }
    );
  }

  try {
    const result = await publishPost({
      accountId,
      text,
      platform,
      mediaUrls,
      pageId,
      scheduledTime,
      title,
    });
    return Response.json(result);
  } catch (err) {
    console.error("Publish error:", err);
    return Response.json(
      {
        error:
          err instanceof Error ? err.message : "Publishing failed",
      },
      { status: 500 }
    );
  }
}
