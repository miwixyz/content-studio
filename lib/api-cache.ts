import { getSupabase } from "@/lib/supabase";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function getCached<T>(key: string): Promise<T | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("analytics_snapshots")
    .select("*")
    .eq("platform", `cache:${key}`)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!data?.[0]) return null;

  const age = Date.now() - new Date(data[0].created_at).getTime();
  if (age > CACHE_TTL_MS) return null;

  return data[0].metrics as T;
}

// Get stale cache as fallback (when API fails)
export async function getStaleCached<T>(key: string): Promise<T | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("analytics_snapshots")
    .select("*")
    .eq("platform", `cache:${key}`)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!data?.[0]) return null;
  return data[0].metrics as T;
}

export async function setCache<T>(key: string, value: T): Promise<void> {
  const supabase = getSupabase();
  await supabase
    .from("analytics_snapshots")
    .delete()
    .eq("platform", `cache:${key}`);

  await supabase.from("analytics_snapshots").insert({
    platform: `cache:${key}`,
    date: new Date().toISOString().split("T")[0],
    metrics: value as Record<string, unknown>,
  });
}
