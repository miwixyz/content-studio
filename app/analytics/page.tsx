"use client";

import { useCallback, useEffect, useState } from "react";
import { StatsCard } from "@/components/dashboard/stats-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, Users, Clock, MousePointer } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

interface ChannelStats {
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
}

interface VideoStats {
  title: string;
  views: number;
  likes: number;
  comments: number;
  publishedAt: string;
}

export default function AnalyticsPage() {
  const [channelStats, setChannelStats] = useState<ChannelStats | null>(null);
  const [recentVideos, setRecentVideos] = useState<VideoStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch("/api/youtube");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch analytics");
      }
      const data = await res.json();
      setChannelStats(data.channel);
      setRecentVideos(data.videos || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load analytics"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading analytics...
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">YouTube channel performance</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Make sure YOUTUBE_API_KEY and YOUTUBE_CHANNEL_ID are set in
              .env.local
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const chartData = recentVideos
    .slice()
    .reverse()
    .map((v) => ({
      name: v.title.length > 25 ? v.title.slice(0, 25) + "..." : v.title,
      views: v.views,
      likes: v.likes,
      comments: v.comments,
    }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">YouTube channel performance</p>
      </div>

      {channelStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Subscribers"
            value={channelStats.subscriberCount.toLocaleString()}
            icon={Users}
          />
          <StatsCard
            title="Total Views"
            value={channelStats.viewCount.toLocaleString()}
            icon={Eye}
          />
          <StatsCard
            title="Videos"
            value={channelStats.videoCount}
            icon={Clock}
          />
          <StatsCard
            title="Avg Views/Video"
            value={
              channelStats.videoCount > 0
                ? Math.round(
                    channelStats.viewCount / channelStats.videoCount
                  ).toLocaleString()
                : "0"
            }
            icon={MousePointer}
          />
        </div>
      )}

      {chartData.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Recent Video Views
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#94A3B8" }}
                    angle={-20}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    tick={{ fill: "#94A3B8" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "#FFFFFF",
                    }}
                  />
                  <Bar dataKey="views" fill="#4F6AFF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Engagement Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#94A3B8" }}
                    angle={-20}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fill: "#94A3B8" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "#FFFFFF",
                    }}
                  />
                  <Line type="monotone" dataKey="likes" stroke="#ef4444" strokeWidth={2} />
                  <Line type="monotone" dataKey="comments" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
