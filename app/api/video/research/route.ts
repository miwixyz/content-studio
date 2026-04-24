import Anthropic from "@anthropic-ai/sdk";
import { getSupabase } from "@/lib/supabase";
import { studio, creatorContext } from "@/config/studio.config";


const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

async function searchYouTube(topic: string, maxResults: number = 20) {
  if (!YOUTUBE_API_KEY) return null;

  // Search by relevance
  const relevanceRes = await fetch(
    `${YOUTUBE_API_BASE}/search?part=snippet&q=${encodeURIComponent(topic)}&type=video&maxResults=${maxResults}&order=relevance&key=${YOUTUBE_API_KEY}`
  );
  const relevanceData = await relevanceRes.json();

  // Search by view count for viral outliers
  const viewsRes = await fetch(
    `${YOUTUBE_API_BASE}/search?part=snippet&q=${encodeURIComponent(topic)}&type=video&maxResults=10&order=viewCount&key=${YOUTUBE_API_KEY}`
  );
  const viewsData = await viewsRes.json();

  // Merge and deduplicate
  const allItems = [...(relevanceData.items || []), ...(viewsData.items || [])];
  const seen = new Set<string>();
  const unique = allItems.filter((item: { id: { videoId: string } }) => {
    if (seen.has(item.id.videoId)) return false;
    seen.add(item.id.videoId);
    return true;
  });

  // Get video details (stats)
  const videoIds = unique.map((item: { id: { videoId: string } }) => item.id.videoId).join(",");
  const detailsRes = await fetch(
    `${YOUTUBE_API_BASE}/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`
  );
  const detailsData = await detailsRes.json();

  return (detailsData.items || []).map(
    (video: {
      id: string;
      snippet: { title: string; channelTitle: string; description: string; publishedAt: string; tags?: string[]; thumbnails: { high?: { url: string } } };
      statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
      contentDetails: { duration: string };
    }) => ({
      videoId: video.id,
      title: video.snippet.title,
      channel: video.snippet.channelTitle,
      description: video.snippet.description.slice(0, 500),
      publishedAt: video.snippet.publishedAt,
      tags: video.snippet.tags || [],
      thumbnailUrl: video.snippet.thumbnails?.high?.url,
      views: parseInt(video.statistics.viewCount || "0"),
      likes: parseInt(video.statistics.likeCount || "0"),
      comments: parseInt(video.statistics.commentCount || "0"),
      duration: video.contentDetails.duration,
    })
  );
}

async function getTopComments(videoId: string, maxResults: number = 30) {
  if (!YOUTUBE_API_KEY) return [];
  try {
    const res = await fetch(
      `${YOUTUBE_API_BASE}/commentThreads?part=snippet&videoId=${videoId}&maxResults=${maxResults}&order=relevance&key=${YOUTUBE_API_KEY}`
    );
    const data = await res.json();
    return (data.items || []).map(
      (item: { snippet: { topLevelComment: { snippet: { textDisplay: string; likeCount: number } } } }) => ({
        text: item.snippet.topLevelComment.snippet.textDisplay,
        likes: item.snippet.topLevelComment.snippet.likeCount,
      })
    );
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  const supabase = getSupabase();
  const { projectId, topic, maxVideos = 20 } = await request.json();

  if (!projectId || !topic) {
    return Response.json(
      { error: "projectId and topic are required" },
      { status: 400 }
    );
  }

  // Update status
  await supabase
    .from("video_projects")
    .update({ status: "researching", updated_at: new Date().toISOString() })
    .eq("id", projectId);

  // Search YouTube
  const videos = await searchYouTube(topic, maxVideos);
  if (!videos || videos.length === 0) {
    return Response.json(
      { error: "No YouTube results found. Check YOUTUBE_API_KEY." },
      { status: 500 }
    );
  }

  // Get comments from top 5 videos by views
  const sortedByViews = [...videos].sort(
    (a: { views: number }, b: { views: number }) => b.views - a.views
  );
  const topVideoIds = sortedByViews.slice(0, 5).map((v: { videoId: string }) => v.videoId);
  const commentsMap: Record<string, { text: string; likes: number }[]> = {};
  for (const vid of topVideoIds) {
    commentsMap[vid] = await getTopComments(vid);
  }

  // Analyze with Claude
  const anthropic = new Anthropic();
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `You are a YouTube content strategist for ${creatorContext()}.

Analyze this competitor research data and produce a structured research brief.

TOPIC: "${topic}"

TOP VIDEOS DATA:
${JSON.stringify(videos.slice(0, 15), null, 2)}

COMMENTS FROM TOP 5 VIDEOS:
${JSON.stringify(commentsMap, null, 2)}

Produce a JSON response with this exact structure:
{
  "topCompetitors": [{ "title": "", "channel": "", "views": 0, "likes": 0, "duration": "", "published": "" }],
  "titlePatterns": ["pattern1", "pattern2"],
  "hookPatterns": ["hook1", "hook2"],
  "thumbnailPatterns": ["pattern1", "pattern2"],
  "viewerPainPoints": ["pain1", "pain2"],
  "viewerQuestions": ["q1", "q2"],
  "contentGaps": ["gap1", "gap2"],
  "blueOceanAngle": "Recommended unique angle for ${studio.creator.channelName}",
  "recommendedTitles": ["title1", "title2", "title3"],
  "recommendedHooks": ["hook1", "hook2", "hook3"],
  "summary": "2-3 sentence summary of the landscape"
}

Return ONLY valid JSON, no markdown formatting.`,
      },
    ],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  let researchBrief;
  try {
    // Strip any markdown code fences if present
    const cleaned = responseText.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
    researchBrief = JSON.parse(cleaned);
  } catch {
    researchBrief = { raw: responseText, parseError: true };
  }

  // Add raw video data to the brief
  researchBrief.rawVideos = videos.slice(0, 15);

  // Save to DB
  const { error } = await supabase
    .from("video_projects")
    .update({
      research_brief: researchBrief,
      status: "researched",
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ researchBrief });
}
