const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

export interface ChannelInfo {
  channelId: string;
  name: string;
  handle: string;
  subscriberCount: number;
  videoCount: number;
  thumbnailUrl: string;
}

export interface VideoInfo {
  videoId: string;
  title: string;
  url: string;
  publishedAt: string;
  thumbnailUrl: string;
  viewCount: number;
  likeCount: number;
}

export async function resolveChannelId(handle: string): Promise<string | null> {
  if (!YOUTUBE_API_KEY) return null;

  // Remove @ if present
  const cleanHandle = handle.startsWith("@") ? handle.slice(1) : handle;

  const res = await fetch(
    `${YOUTUBE_API_BASE}/channels?part=id&forHandle=${cleanHandle}&key=${YOUTUBE_API_KEY}`
  );
  const data = await res.json();
  return data.items?.[0]?.id || null;
}

export async function getChannelInfo(
  handle: string
): Promise<ChannelInfo | null> {
  if (!YOUTUBE_API_KEY) return null;

  const cleanHandle = handle.startsWith("@") ? handle.slice(1) : handle;

  const res = await fetch(
    `${YOUTUBE_API_BASE}/channels?part=snippet,statistics&forHandle=${cleanHandle}&key=${YOUTUBE_API_KEY}`
  );
  const data = await res.json();
  const channel = data.items?.[0];
  if (!channel) return null;

  return {
    channelId: channel.id,
    name: channel.snippet.title,
    handle: `@${cleanHandle}`,
    subscriberCount: parseInt(channel.statistics.subscriberCount || "0"),
    videoCount: parseInt(channel.statistics.videoCount || "0"),
    thumbnailUrl: channel.snippet.thumbnails?.default?.url || "",
  };
}

export async function getLatestVideos(
  channelId: string,
  maxResults = 3
): Promise<VideoInfo[]> {
  if (!YOUTUBE_API_KEY) return [];

  // Search for latest videos
  const searchRes = await fetch(
    `${YOUTUBE_API_BASE}/search?part=snippet&channelId=${channelId}&order=date&maxResults=${maxResults}&type=video&key=${YOUTUBE_API_KEY}`
  );
  const searchData = await searchRes.json();

  if (!searchData.items?.length) return [];

  const videoIds = searchData.items
    .map((item: { id: { videoId: string } }) => item.id.videoId)
    .join(",");

  // Get video stats
  const videosRes = await fetch(
    `${YOUTUBE_API_BASE}/videos?part=statistics,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY}`
  );
  const videosData = await videosRes.json();

  return (videosData.items || []).map(
    (video: {
      id: string;
      snippet: {
        title: string;
        publishedAt: string;
        thumbnails: { medium: { url: string } };
      };
      statistics: { viewCount: string; likeCount: string };
    }) => ({
      videoId: video.id,
      title: video.snippet.title,
      url: `https://www.youtube.com/watch?v=${video.id}`,
      publishedAt: video.snippet.publishedAt,
      thumbnailUrl: video.snippet.thumbnails?.medium?.url || "",
      viewCount: parseInt(video.statistics.viewCount || "0"),
      likeCount: parseInt(video.statistics.likeCount || "0"),
    })
  );
}
