"use client";

import { useCallback, useEffect, useState } from "react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ContentStatusBadge } from "@/components/dashboard/content-status";
import { PlatformBadge } from "@/components/dashboard/platform-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Calendar, Play, Eye, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { CalendarItem, Script } from "@/lib/types";

interface YouTubeVideo {
  title: string;
  views: number;
  likes: number;
  publishedAt: string;
}

interface ChannelStats {
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
}

export default function OverviewPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [upcoming, setUpcoming] = useState<CalendarItem[]>([]);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [channelStats, setChannelStats] = useState<ChannelStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [scriptsRes, calendarRes, youtubeRes] = await Promise.all([
        supabase
          .from("scripts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("calendar_items")
          .select("*")
          .gte("scheduled_date", new Date().toISOString().split("T")[0])
          .order("scheduled_date", { ascending: true })
          .limit(5),
        fetch("/api/youtube").then((r) => r.json()).catch(() => null),
      ]);

      setScripts(scriptsRes.data || []);
      setUpcoming(calendarRes.data || []);
      if (youtubeRes) {
        setVideos(youtubeRes.videos || []);
        setChannelStats(youtubeRes.channel || null);
      }
    } catch (err) {
      console.error("Failed to fetch overview data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const timeAgo = (dateStr: string) => {
    const days = Math.floor(
      (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days === 0) return "today";
    if (days === 1) return "1d ago";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground">
          Your content creation command center
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Subscribers"
          value={channelStats?.subscriberCount.toLocaleString() || "-"}
          icon={Users}
        />
        <StatsCard
          title="Total Views"
          value={channelStats?.viewCount.toLocaleString() || "-"}
          icon={Eye}
        />
        <StatsCard
          title="Scripts"
          value={scripts.length}
          icon={FileText}
          description="in database"
        />
        <StatsCard
          title="Upcoming"
          value={upcoming.length}
          icon={Calendar}
          description="scheduled items"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Play className="h-4 w-4 text-red-400" />
              Latest Videos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {videos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No videos loaded. Check YouTube API key.
              </p>
            ) : (
              <div className="space-y-3">
                {videos.slice(0, 5).map((video, i) => (
                  <a
                    key={i}
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(video.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors group"
                  >
                    <Play className="h-3.5 w-3.5 mt-0.5 text-red-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug group-hover:underline line-clamp-2">
                        {video.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{video.views.toLocaleString()} views</span>
                        <span>{timeAgo(video.publishedAt)}</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Content</CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming content scheduled
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcoming.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.title}
                      </TableCell>
                      <TableCell>
                        <PlatformBadge platform={item.platform} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.scheduled_date}
                      </TableCell>
                      <TableCell>
                        <ContentStatusBadge status={item.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
