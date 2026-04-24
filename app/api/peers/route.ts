import { PEER_CHANNELS } from "@/lib/sources";
import { getChannelInfo, getLatestVideos } from "@/lib/youtube-api";
import { getCached, getStaleCached, setCache } from "@/lib/api-cache";

export async function GET() {
  if (!process.env.YOUTUBE_API_KEY) {
    return Response.json(
      { error: "YOUTUBE_API_KEY not configured" },
      { status: 500 }
    );
  }

  // Check cache first (6 hour TTL)
  const cached = await getCached<{ peers: unknown[] }>("peers");
  if (cached) {
    return Response.json(cached);
  }

  try {
    const peers = await Promise.all(
      PEER_CHANNELS.map(async (peer) => {
        const handle = peer.handle.replace("@", "");
        const channel = await getChannelInfo(handle);
        if (!channel) {
          return {
            name: peer.name,
            handle: peer.handle,
            url: peer.url,
            subscriberCount: null,
            videos: [],
            error: "Channel not found",
          };
        }

        const videos = await getLatestVideos(channel.channelId, 3);

        return {
          name: peer.name,
          handle: peer.handle,
          url: peer.url,
          subscriberCount: channel.subscriberCount,
          thumbnailUrl: channel.thumbnailUrl,
          videos,
          isOwn: "isOwn" in peer && peer.isOwn === true,
        };
      })
    );

    const result = { peers };
    await setCache("peers", result);
    return Response.json(result);
  } catch (err) {
    console.error("Peers fetch error:", err);
    const stale = await getStaleCached<{ peers: unknown[] }>("peers");
    if (stale) {
      return Response.json(stale);
    }
    return Response.json(
      { error: "Failed to fetch peer data" },
      { status: 500 }
    );
  }
}
