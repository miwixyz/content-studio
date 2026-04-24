"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Zap,
  ExternalLink,
  Lightbulb,
  Video,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Digest {
  date: string;
  top_insight: {
    title: string;
    body: string;
    source_url: string;
  };
  key_updates: Array<{
    title: string;
    body: string;
    source_url: string;
  }>;
  video_ideas: Array<{
    title: string;
    angle: string;
  }>;
  summary: string;
}

interface StoredDigest {
  id: string;
  published_date: string;
  summary: string; // JSON stringified Digest
  created_at: string;
}

export default function NewsPage() {
  const [currentDigest, setCurrentDigest] = useState<Digest | null>(null);
  const [pastDigests, setPastDigests] = useState<
    Array<{ date: string; digest: Digest }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const fetchDigests = useCallback(async () => {
    const { data } = await supabase
      .from("news_items")
      .select("*")
      .eq("category", "digest")
      .order("published_date", { ascending: false })
      .limit(14);

    if (data?.length) {
      const today = new Date().toISOString().split("T")[0];
      const parsed: Array<{ date: string; digest: Digest }> = [];

      for (const item of data as StoredDigest[]) {
        try {
          const digest = JSON.parse(item.summary);
          parsed.push({ date: item.published_date, digest });
        } catch {
          // Skip malformed entries
        }
      }

      const todaysDigest = parsed.find((p) => p.date === today);
      if (todaysDigest) {
        setCurrentDigest(todaysDigest.digest);
        setPastDigests(parsed.filter((p) => p.date !== today));
      } else {
        setCurrentDigest(null);
        setPastDigests(parsed);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDigests();
  }, [fetchDigests]);

  const handleGenerate = async () => {
    setFetching(true);
    setError(null);
    try {
      const res = await fetch("/api/news/fetch", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.digest) {
        setCurrentDigest(data.digest);
        fetchDigests();
      } else {
        setError(data.error || "Failed to generate digest");
      }
    } catch {
      setError("Failed to generate digest");
    } finally {
      setFetching(false);
    }
  };

  const toggleDate = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI News</h1>
          <p className="text-muted-foreground">
            Daily AI digest from tracked sources
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={fetching}>
          <RefreshCw
            className={cn("h-4 w-4 mr-2", fetching && "animate-spin")}
          />
          {fetching ? "Analyzing sources..." : "Generate Today's Digest"}
        </Button>
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* Today's Digest */}
      {currentDigest ? (
        <div className="space-y-4">
          {/* Top Insight */}
          <Card className="border-blue-500/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-400" />
                <CardTitle className="text-sm text-muted-foreground">
                  Top AI Insight - {currentDigest.date}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <h2 className="text-lg font-semibold mb-2">
                {currentDigest.top_insight.title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {currentDigest.top_insight.body}
              </p>
              {currentDigest.top_insight.source_url && (
                <a
                  href={currentDigest.top_insight.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline mt-3"
                >
                  Source <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </CardContent>
          </Card>

          {/* Key Updates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-blue-400" />
                Key Updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentDigest.key_updates.map((update, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Badge
                      variant="outline"
                      className="shrink-0 mt-0.5 text-xs"
                    >
                      {i + 1}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{update.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {update.body}
                      </p>
                      {update.source_url && (
                        <a
                          href={update.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline mt-1"
                        >
                          Source <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Video Ideas */}
          {currentDigest.video_ideas.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Video className="h-4 w-4 text-green-400" />
                  Video Ideas from Today's News
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentDigest.video_ideas.map((idea, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg border border-green-500/20 bg-green-500/5"
                    >
                      <p className="text-sm font-medium">{idea.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {idea.angle}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          <div className="text-sm text-muted-foreground bg-muted/30 rounded-md px-4 py-3">
            {currentDigest.summary}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              No digest for today yet. Click "Generate Today's Digest" to
              analyze the latest AI news from your tracked sources.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Past Digests */}
      {pastDigests.length > 0 && (
        <>
          <Separator />
          <h2 className="text-lg font-semibold">Past Digests</h2>
          <div className="space-y-2">
            {pastDigests.map(({ date, digest }) => (
              <Card key={date}>
                <button
                  className="w-full p-4 flex items-center justify-between text-left"
                  onClick={() => toggleDate(date)}
                >
                  <div>
                    <span className="text-sm font-medium">{date}</span>
                    <span className="text-xs text-muted-foreground ml-3">
                      {digest.top_insight.title}
                    </span>
                  </div>
                  {expandedDates.has(date) ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {expandedDates.has(date) && (
                  <CardContent className="pt-0 space-y-3">
                    <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                      <p className="text-sm font-medium">
                        {digest.top_insight.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {digest.top_insight.body}
                      </p>
                    </div>
                    {digest.key_updates.map((u, i) => (
                      <div key={i} className="text-sm">
                        <span className="font-medium">{u.title}</span>
                        <span className="text-muted-foreground ml-2">
                          {u.body}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
