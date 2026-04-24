"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, ExternalLink, Users, Play, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface PeerVideo {
  videoId: string;
  title: string;
  url: string;
  publishedAt: string;
  viewCount: number;
}

interface Peer {
  name: string;
  handle: string;
  url: string;
  subscriberCount: number | null;
  thumbnailUrl?: string;
  videos: PeerVideo[];
  error?: string;
  isOwn?: boolean;
}

export default function PeersPage() {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPeers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/peers");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setPeers(data.peers);
    } catch {
      setError("Failed to fetch peer data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPeers();
  }, [fetchPeers]);

  const formatSubs = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatViews = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "today";
    if (days === 1) return "1d ago";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  if (error && peers.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Peers</h1>
          <p className="text-muted-foreground">
            YouTube channels in your space
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Make sure YOUTUBE_API_KEY is set in .env.local
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Peers</h1>
          <p className="text-muted-foreground">
            YouTube channels in your space
          </p>
        </div>
        <Button variant="outline" onClick={fetchPeers} disabled={loading}>
          <RefreshCw
            className={cn("h-4 w-4 mr-2", loading && "animate-spin")}
          />
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      {loading && peers.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Fetching peer channels...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {peers.map((peer) => (
            <Card key={peer.handle} className={cn(peer.isOwn && "border-blue-500/40 bg-blue-500/5")}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {peer.thumbnailUrl && (
                      <img
                        src={peer.thumbnailUrl}
                        alt={peer.name}
                        className="w-10 h-10 rounded-full"
                      />
                    )}
                    <div>
                      <CardTitle className="text-base">
                        <a
                          href={peer.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline flex items-center gap-1"
                        >
                          {peer.name}
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </a>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {peer.handle}
                      </p>
                    </div>
                  </div>
                  {peer.subscriberCount != null && (
                    <div className="flex items-center gap-1 text-sm font-medium">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatSubs(peer.subscriberCount)}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {peer.error ? (
                  <p className="text-sm text-muted-foreground">{peer.error}</p>
                ) : peer.videos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No videos found
                  </p>
                ) : (
                  <div className="space-y-2">
                    {peer.videos.map((video) => (
                      <a
                        key={video.videoId}
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-2 p-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors group"
                      >
                        <Play className="h-3.5 w-3.5 mt-0.5 text-red-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-snug group-hover:underline line-clamp-2">
                            {video.title}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-0.5">
                              <Eye className="h-3 w-3" />
                              {formatViews(video.viewCount)}
                            </span>
                            <span>{timeAgo(video.publishedAt)}</span>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
