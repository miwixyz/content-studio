import { getSupabase } from "@/lib/supabase";


function toSlug(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export async function POST(request: Request) {
  const supabase = getSupabase();
  const { topic, contentPillar, targetLength } = await request.json();

  if (!topic?.trim()) {
    return Response.json({ error: "Topic is required" }, { status: 400 });
  }

  const slug = toSlug(topic) + "-" + Date.now().toString(36);

  const { data, error } = await supabase
    .from("video_projects")
    .insert({
      topic: topic.trim(),
      slug,
      status: "idea",
      content_pillar: contentPillar || null,
      target_length: targetLength || 12,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ project: data });
}

export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("video_projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ projects: data });
}
