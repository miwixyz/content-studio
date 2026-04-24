"use client";

import { useState, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Film,
  Upload,
  Loader2,
  Send,
  Check,
  Trash2,
  ExternalLink,
  Play,
  Globe,
  Image,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ShortClip {
  id: string;
  file: File;
  filename: string;
  status: "uploading" | "transcribing" | "generating" | "ready" | "publishing" | "published" | "failed";
  videoUrl?: string;
  transcript?: string;
  captions?: {
    title: string;
    platforms: {
      shorts?: { title: string; description: string };
      reels?: { caption: string };
      tiktok?: { caption: string };
    };
  };
  selectedPlatforms: string[];
  scheduledTime?: string;
  publishResults?: Record<string, { status: string; url?: string; error?: string }>;
  error?: string;
}

const PLATFORMS = [
  { id: "shorts", label: "YouTube Shorts", icon: Play },
  { id: "reels", label: "Instagram Reels", icon: Image },
  { id: "tiktok", label: "TikTok", icon: Video },
];

export default function ShortsPage() {
  const [clips, setClips] = useState<ShortClip[]>([]);
  const [dragging, setDragging] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [accounts, setAccounts] = useState<
    Array<{ id: string; platform: string; displayName: string; username: string }>
  >([]);
  const [selectedAccounts, setSelectedAccounts] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Blotato accounts on first interaction
  const fetchAccounts = useCallback(async () => {
    if (accounts.length > 0) return;
    try {
      const res = await fetch("/api/publish/accounts");
      const data = await res.json();
      if (res.ok) {
        setAccounts(data.accounts);
        const auto: Record<string, string> = {};
        for (const acc of data.accounts) {
          const p = acc.platform.replace("-page", "");
          if (!auto[p]) auto[p] = acc.id;
        }
        setSelectedAccounts(auto);
      }
    } catch {}
  }, [accounts.length]);

  const updateClip = (id: string, updates: Partial<ShortClip>) => {
    setClips((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const addFiles = (files: FileList | File[]) => {
    const newClips: ShortClip[] = Array.from(files)
      .filter((f) => f.type.startsWith("video/"))
      .map((f) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file: f,
        filename: f.name,
        status: "uploading" as const,
        selectedPlatforms: ["shorts", "reels", "tiktok"],
      }));
    setClips((prev) => [...prev, ...newClips]);
    fetchAccounts();
    // Process each new clip
    for (const clip of newClips) {
      processClip(clip);
    }
  };

  const processClip = async (clip: ShortClip) => {
    // Step 1: Upload + transcribe
    updateClip(clip.id, { status: "uploading" });

    try {
      const formData = new FormData();
      formData.append("file", clip.file);

      const uploadRes = await fetch("/api/shorts/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        updateClip(clip.id, { status: "failed", error: uploadData.error });
        return;
      }

      updateClip(clip.id, {
        status: "generating",
        videoUrl: uploadData.videoUrl,
        transcript: uploadData.transcript,
      });

      // Step 2: Generate captions
      const captionRes = await fetch("/api/shorts/captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: uploadData.transcript,
          platforms: clip.selectedPlatforms,
        }),
      });
      const captionData = await captionRes.json();

      if (captionRes.ok) {
        updateClip(clip.id, { status: "ready", captions: captionData });
      } else {
        updateClip(clip.id, {
          status: "ready",
          error: "Caption generation failed - add manually",
        });
      }
    } catch (err) {
      updateClip(clip.id, {
        status: "failed",
        error: "Processing failed",
      });
    }
  };

  const publishClip = async (clipId: string) => {
    const clip = clips.find((c) => c.id === clipId);
    if (!clip?.videoUrl || !clip.captions) return;

    updateClip(clipId, { status: "publishing" });
    const results: Record<string, { status: string; url?: string; error?: string }> = {};

    for (const platform of clip.selectedPlatforms) {
      const accountId =
        platform === "shorts"
          ? selectedAccounts["youtube"]
          : platform === "reels"
            ? selectedAccounts["instagram"]
            : selectedAccounts["tiktok"];

      if (!accountId) {
        results[platform] = { status: "failed", error: "No account connected" };
        continue;
      }

      let text = "";
      const blotaPlatform =
        platform === "shorts"
          ? "youtube"
          : platform === "reels"
            ? "instagram"
            : "tiktok";

      if (platform === "shorts" && clip.captions.platforms.shorts) {
        text = clip.captions.platforms.shorts.description;
      } else if (platform === "reels" && clip.captions.platforms.reels) {
        text = clip.captions.platforms.reels.caption;
      } else if (platform === "tiktok" && clip.captions.platforms.tiktok) {
        text = clip.captions.platforms.tiktok.caption;
      }

      try {
        const res = await fetch("/api/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId,
            text,
            platform: blotaPlatform,
            mediaUrls: [clip.videoUrl],
            scheduledTime: clip.scheduledTime || undefined,
            title: platform === "shorts"
              ? clip.captions.platforms.shorts?.title
              : clip.captions.title,
          }),
        });
        const data = await res.json();
        results[platform] = {
          status: data.status === "published" || data.status === "pending" ? "published" : "failed",
          url: data.publicUrl,
          error: data.error || data.errorMessage,
        };
      } catch {
        results[platform] = { status: "failed", error: "Network error" };
      }
    }

    updateClip(clipId, { status: "published", publishResults: results });
  };

  const publishAll = async () => {
    const readyClips = clips.filter((c) => c.status === "ready");
    for (const clip of readyClips) {
      await publishClip(clip.id);
    }
  };

  const removeClip = (id: string) => {
    setClips((prev) => prev.filter((c) => c.id !== id));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const readyCount = clips.filter((c) => c.status === "ready").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shorts</h1>
          <p className="text-muted-foreground">
            Upload and publish short-form videos to all platforms
          </p>
        </div>
        {readyCount > 0 && (
          <Button onClick={publishAll}>
            <Send className="h-4 w-4 mr-2" />
            Publish All ({readyCount})
          </Button>
        )}
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <Upload
          className={cn(
            "h-10 w-10 mx-auto mb-3",
            dragging ? "text-primary" : "text-muted-foreground"
          )}
        />
        <p className="text-sm font-medium">
          Drop video files here or click to browse
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          MP4, MOV, or any video format. Multiple files supported.
        </p>
      </div>

      {/* Clips */}
      {clips.length > 0 && (
        <div className="space-y-4">
          {clips.map((clip) => (
            <Card
              key={clip.id}
              className={cn(
                clip.status === "published" && "border-green-500/30",
                clip.status === "failed" && "border-red-500/30"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Film className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm">
                      {clip.captions?.title || clip.filename}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        clip.status === "ready" && "text-green-400",
                        clip.status === "published" && "text-green-400",
                        clip.status === "failed" && "text-red-400",
                        (clip.status === "uploading" ||
                          clip.status === "transcribing" ||
                          clip.status === "generating") &&
                          "text-yellow-400"
                      )}
                    >
                      {clip.status === "uploading" && "Uploading..."}
                      {clip.status === "transcribing" && "Transcribing..."}
                      {clip.status === "generating" && "Generating captions..."}
                      {clip.status === "ready" && "Ready"}
                      {clip.status === "publishing" && "Publishing..."}
                      {clip.status === "published" && "Published"}
                      {clip.status === "failed" && "Failed"}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeClip(clip.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </CardHeader>

              {clip.status === "ready" && clip.captions && (
                <>
                  <Separator />
                  <CardContent className="pt-4 space-y-4">
                    {clip.error && (
                      <p className="text-xs text-destructive">{clip.error}</p>
                    )}

                    {/* Platform captions */}
                    {clip.captions.platforms.shorts && (
                      <div>
                        <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                          <Play className="h-3 w-3" /> YouTube Shorts
                        </label>
                        <Input
                          value={clip.captions.platforms.shorts.title}
                          onChange={(e) => {
                            const updated = { ...clip.captions! };
                            updated.platforms.shorts!.title = e.target.value;
                            updateClip(clip.id, { captions: updated });
                          }}
                          className="text-xs mb-1"
                          placeholder="Title"
                        />
                        <Textarea
                          value={clip.captions.platforms.shorts.description}
                          onChange={(e) => {
                            const updated = { ...clip.captions! };
                            updated.platforms.shorts!.description = e.target.value;
                            updateClip(clip.id, { captions: updated });
                          }}
                          rows={2}
                          className="text-xs"
                          placeholder="Description"
                        />
                      </div>
                    )}

                    {clip.captions.platforms.reels && (
                      <div>
                        <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                          <Image className="h-3 w-3" /> Instagram Reels
                        </label>
                        <Textarea
                          value={clip.captions.platforms.reels.caption}
                          onChange={(e) => {
                            const updated = { ...clip.captions! };
                            updated.platforms.reels!.caption = e.target.value;
                            updateClip(clip.id, { captions: updated });
                          }}
                          rows={2}
                          className="text-xs"
                          placeholder="Caption"
                        />
                      </div>
                    )}

                    {clip.captions.platforms.tiktok && (
                      <div>
                        <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                          <Video className="h-3 w-3" /> TikTok
                        </label>
                        <Textarea
                          value={clip.captions.platforms.tiktok.caption}
                          onChange={(e) => {
                            const updated = { ...clip.captions! };
                            updated.platforms.tiktok!.caption = e.target.value;
                            updateClip(clip.id, { captions: updated });
                          }}
                          rows={2}
                          className="text-xs"
                          placeholder="Caption"
                        />
                      </div>
                    )}

                    {/* Schedule + Publish */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="datetime-local"
                          className="bg-transparent border border-border rounded-md px-2 py-1 text-xs"
                          value={clip.scheduledTime || ""}
                          onChange={(e) =>
                            updateClip(clip.id, {
                              scheduledTime: e.target.value,
                            })
                          }
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => publishClip(clip.id)}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        {clip.scheduledTime ? "Schedule" : "Publish"}
                      </Button>
                    </div>
                  </CardContent>
                </>
              )}

              {/* Publishing status */}
              {clip.status === "publishing" && (
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Publishing to platforms...
                  </div>
                </CardContent>
              )}

              {clip.publishResults && (
                <CardContent className="pt-0">
                  <div className="space-y-1">
                    {Object.entries(clip.publishResults).map(
                      ([platform, result]) => (
                        <div
                          key={platform}
                          className="flex items-center gap-2 text-xs"
                        >
                          {result.status === "published" ? (
                            <Check className="h-3 w-3 text-green-400" />
                          ) : (
                            <span className="text-red-400">x</span>
                          )}
                          <span className="capitalize">{platform}</span>
                          {result.url && (
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline"
                            >
                              <ExternalLink className="h-3 w-3 inline" />
                            </a>
                          )}
                          {result.error && (
                            <span className="text-red-400">
                              {result.error}
                            </span>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              )}

              {clip.status === "failed" && clip.error && (
                <CardContent className="pt-0">
                  <p className="text-xs text-destructive">{clip.error}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
