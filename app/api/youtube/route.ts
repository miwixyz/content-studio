import { getCached, getStaleCached, setCache } from "@/lib/api-cache";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

export async function GET() {
  if (!YOUTUBE_API_KEY || !YOUTUBE_CHANNEL_ID) {
    return Response.json(
      { error: "YouTube API key or Channel ID not configured" },
      { status: 500 }
    );
  }

  const cached = await getCached<{ channel: unknown; videos: unknown[] }>("youtube-own");
  if (cached) {
    return Response.json(cached);
  }

  try {
    // Fetch channel statistics
    const channelRes = await fetch(
      `${YOUTUBE_API_BASE}/channels?part=statistics&id=${YOUTUBE_CHANNEL_ID}&key=${YOUTUBE_API_KEY}`
    );
    const channelData = await channelRes.json();

    if (!channelData.items?.[0]) {
      // API might have returned an error (quota etc) - try stale cache
      const stale = await getStaleCached<{ channel: unknown; videos: unknown[] }>("youtube-own");
      if (stale) return Response.json(stale);
      return Response.json({ error: "Channel not found" }, { status: 404 });
    }

    const stats = channelData.items[0].statistics;
    const channel = {
      subscriberCount: parseInt(stats.subscriberCount),
      viewCount: parseInt(stats.viewCount),
      videoCount: parseInt(stats.videoCount),
    };

    // Fetch recent videos
    const searchRes = await fetch(
      `${YOUTUBE_API_BASE}/search?part=snippet&channelId=${YOUTUBE_CHANNEL_ID}&order=date&maxResults=10&type=video&key=${YOUTUBE_API_KEY}`
    );
    const searchData = await searchRes.json();

    const videoIds = (searchData.items || [])
      .map((item: { id: { videoId: string } }) => item.id.videoId)
      .join(",");

    let videos: Array<{
      title: string;
      views: number;
      likes: number;
      comments: number;
      publishedAt: string;
    }> = [];

    if (videoIds) {
      const videosRes = await fetch(
        `${YOUTUBE_API_BASE}/videos?part=statistics,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY}`
      );
      const videosData = await videosRes.json();

      videos = (videosData.items || []).map(
        (video: {
          snippet: { title: string; publishedAt: string };
          statistics: {
            viewCount: string;
            likeCount: string;
            commentCount: string;
          };
        }) => ({
          title: video.snippet.title,
          views: parseInt(video.statistics.viewCount || "0"),
          likes: parseInt(video.statistics.likeCount || "0"),
          comments: parseInt(video.statistics.commentCount || "0"),
          publishedAt: video.snippet.publishedAt,
        })
      );
    }

    const result = { channel, videos };
    await setCache("youtube-own", result);
    return Response.json(result);
  } catch (err) {
    console.error("YouTube API error:", err);
    // Fall back to stale cache
    const stale = await getStaleCached<{ channel: unknown; videos: unknown[] }>("youtube-own");
    if (stale) {
      return Response.json(stale);
    }
    return Response.json(
      { error: "Failed to fetch YouTube data" },
      { status: 500 }
    );
  }
}
