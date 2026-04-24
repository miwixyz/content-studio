"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  CarouselSlide,
  type SlideData,
} from "@/components/dashboard/carousel-slide";
import {
  Repeat2,
  Copy,
  Check,
  Play,
  Globe,
  Hash,
  Image,
  Video,
  Send,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toPng } from "html-to-image";

const HTML_TO_IMAGE_OPTS = {
  width: 1080,
  height: 1350,
  pixelRatio: 1,
  skipFonts: true,
};

/**
 * Temporarily remove cross-origin stylesheets that cause SecurityError
 * when html-to-image tries to read cssRules, then restore them after.
 */
function withoutCrossOriginStyles<T>(fn: () => Promise<T>): Promise<T> {
  const removed: { el: HTMLLinkElement; parent: Node }[] = [];
  document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
    const href = link.getAttribute("href") || "";
    if (href.startsWith("http") && !href.includes(window.location.host)) {
      if (link.parentNode) {
        removed.push({ el: link as HTMLLinkElement, parent: link.parentNode });
        link.parentNode.removeChild(link);
      }
    }
  });
  return fn().finally(() => {
    for (const { el, parent } of removed) {
      parent.appendChild(el);
    }
  });
}

const PLATFORMS = [
  { id: "linkedin", label: "LinkedIn", icon: Globe, color: "text-blue-400", badge: "+ slides" },
  { id: "x", label: "X / Twitter", icon: Hash, color: "text-zinc-300" },
  { id: "instagram", label: "Instagram", icon: Image, color: "text-pink-400", badge: "+ slides" },
  { id: "shortform", label: "Short Form", icon: Video, color: "text-cyan-400", badge: "+ video script" },
];

interface VideoInfo {
  title: string;
  views: number;
  likes: number;
  hasTranscript: boolean;
}

interface BlotaAccount {
  id: string;
  platform: string;
  username: string;
  displayName: string;
}

interface PlatformResult {
  text: string;
  slides?: SlideData[];
  status: "draft" | "publishing" | "published" | "failed";
  publicUrl?: string;
  error?: string;
}

export default function RepurposePage() {
  const [url, setUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    "linkedin",
    "x",
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [results, setResults] = useState<Record<string, PlatformResult>>({});
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<BlotaAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<
    Record<string, string>
  >({});
  const [scheduledTimes, setScheduledTimes] = useState<
    Record<string, string>
  >({});
  const [currentSlides, setCurrentSlides] = useState<Record<string, number>>({});
  const [exportingSlides, setExportingSlides] = useState(false);
  const [slideUrls, setSlideUrls] = useState<Record<string, string[]>>({});
  const slidesRef = useRef<HTMLDivElement>(null);

  // Fetch Blotato accounts
  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/publish/accounts");
      const data = await res.json();
      if (res.ok) {
        setAccounts(data.accounts);
        // Auto-select first account per platform
        const autoSelect: Record<string, string> = {};
        for (const acc of data.accounts) {
          const platform = acc.platform.replace("-page", "");
          if (!autoSelect[platform]) autoSelect[platform] = acc.id;
        }
        setSelectedAccounts(autoSelect);
      }
    } catch {
      // Accounts not available
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleRepurpose = async () => {
    if ((!url.trim() && !transcript.trim()) || selectedPlatforms.length === 0) return;

    setLoading(true);
    setError(null);
    setResults({});
    setVideoInfo(null);
    setSlideUrls({});
    setCurrentSlides({});

    try {
      // Generate text for all platforms
      const textRes = await fetch("/api/repurpose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim() || undefined,
          transcript: transcript.trim() || undefined,
          platforms: selectedPlatforms,
        }),
      });
      const textData = await textRes.json();

      if (!textRes.ok) {
        setError(textData.error || "Failed to repurpose");
        setLoading(false);
        return;
      }

      setVideoInfo(textData.video);

      // Build results
      const newResults: Record<string, PlatformResult> = {};
      for (const platform of selectedPlatforms) {
        newResults[platform] = {
          text: textData.results[platform] || "",
          status: "draft",
        };
      }

      // Generate slides for LinkedIn and Instagram based on their post text
      const slidePlatforms = selectedPlatforms.filter(
        (p) => (p === "linkedin" || p === "instagram") && newResults[p]?.text
      );
      for (const platform of slidePlatforms) {
        try {
          const count = platform === "linkedin" ? 7 : 5;
          const slidesRes = await fetch("/api/publish/slides", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              input: `${platform === "linkedin" ? "LinkedIn" : "Instagram"} post to turn into carousel slides:\n\n${newResults[platform].text}`,
              slideCount: count,
            }),
          });
          const slidesData = await slidesRes.json();
          if (slidesRes.ok && slidesData.slides) {
            newResults[platform].slides = slidesData.slides;
          }
        } catch {
          // Slides generation failed, continue with text only
        }
      }

      setResults(newResults);
    } catch {
      setError("Failed to connect to API");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (platform: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedPlatform(platform);
    setTimeout(() => setCopiedPlatform(null), 2000);
  };

  const updateText = (platform: string, text: string) => {
    setResults((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], text },
    }));
  };

  const updateSlide = (platform: string, index: number, updates: Partial<SlideData>) => {
    setResults((prev) => {
      const target = prev[platform];
      if (!target?.slides) return prev;
      const newSlides = [...target.slides];
      newSlides[index] = { ...newSlides[index], ...updates };
      return { ...prev, [platform]: { ...target, slides: newSlides } };
    });
  };

  const exportSlides = async (platform: string): Promise<string[]> => {
    if (!slidesRef.current) return [];
    setExportingSlides(true);

    const urls: string[] = [];
    const scope = slidesRef.current.querySelector(
      `[data-platform="${platform}"]`
    );
    if (!scope) {
      setExportingSlides(false);
      return [];
    }
    const slideElements = scope.querySelectorAll(".carousel-slide");

    for (let i = 0; i < slideElements.length; i++) {
      const el = slideElements[i] as HTMLElement;
      const dataUrl = await withoutCrossOriginStyles(() =>
        toPng(el, HTML_TO_IMAGE_OPTS)
      );
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `${platform}-slide-${i + 1}.png`, {
        type: "image/png",
      });
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/publish/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (uploadRes.ok && uploadData.url) {
        urls.push(uploadData.url);
      }
    }

    setSlideUrls((prev) => ({ ...prev, [platform]: urls }));
    setExportingSlides(false);
    return urls;
  };

  const downloadSlides = async (platform: string) => {
    if (!slidesRef.current) return;
    const scope = slidesRef.current.querySelector(
      `[data-platform="${platform}"]`
    );
    if (!scope) return;
    const slideElements = scope.querySelectorAll(".carousel-slide");
    for (let i = 0; i < slideElements.length; i++) {
      const el = slideElements[i] as HTMLElement;
      const dataUrl = await withoutCrossOriginStyles(() =>
        toPng(el, HTML_TO_IMAGE_OPTS)
      );
      const link = document.createElement("a");
      link.download = `${platform}-slide-${i + 1}.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  const publishPlatform = async (platform: string) => {
    const result = results[platform];
    const accountId = selectedAccounts[platform];
    if (!result || !accountId) return;

    setResults((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], status: "publishing" },
    }));

    try {
      // For platforms with slides, export slides first (scoped per-platform)
      let mediaUrls: string[] = [];
      if (result.slides?.length) {
        const cached = slideUrls[platform];
        if (cached && cached.length > 0) {
          mediaUrls = cached;
        } else {
          try {
            mediaUrls = await exportSlides(platform);
          } catch (slideErr) {
            console.error("Slide export failed:", slideErr);
          }
        }

        if (mediaUrls.length === 0) {
          setResults((prev) => ({
            ...prev,
            [platform]: {
              ...prev[platform],
              status: "failed",
              error: "Slide export failed - cannot publish without images. Try downloading slides manually first.",
            },
          }));
          return;
        }
      }

      const scheduledTime = scheduledTimes[platform];
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          text: result.text,
          platform,
          mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
          scheduledTime: scheduledTime || undefined,
        }),
      });
      const data = await res.json();

      if (res.ok && (data.status === "published" || data.status === "pending")) {
        setResults((prev) => ({
          ...prev,
          [platform]: {
            ...prev[platform],
            status: "published",
            publicUrl: data.publicUrl,
          },
        }));
      } else {
        setResults((prev) => ({
          ...prev,
          [platform]: {
            ...prev[platform],
            status: "failed",
            error: data.error || data.errorMessage || "Failed",
          },
        }));
      }
    } catch {
      setResults((prev) => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          status: "failed",
          error: "Network error",
        },
      }));
    }
  };

  const publishAll = async () => {
    const drafts = Object.entries(results).filter(
      ([platform, r]) => r.status === "draft" && selectedAccounts[platform]
    );
    for (const [platform] of drafts) {
      await publishPlatform(platform);
    }
  };

  const platformMeta = (id: string) =>
    PLATFORMS.find((p) => p.id === id) || PLATFORMS[0];
  const hasResults = Object.keys(results).length > 0;
  const hasDrafts = Object.values(results).some(
    (r) => r.status === "draft"
  );
  const platformAccounts = accounts.reduce(
    (acc, a) => {
      const p = a.platform.replace("-page", "");
      if (!acc[p]) acc[p] = [];
      acc[p].push(a);
      return acc;
    },
    {} as Record<string, BlotaAccount[]>
  );

  return (
    <div className="space-y-6">
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <div>
        <h1 className="text-2xl font-bold">Repurpose</h1>
        <p className="text-muted-foreground">
          Turn a YouTube video into posts + slides, then publish
        </p>
      </div>

      {/* Input */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              YouTube URL
              <span className="text-muted-foreground font-normal ml-1">
                (optional if transcript provided)
              </span>
            </label>
            <div className="relative">
              <Play className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-400" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="pl-10"
                onKeyDown={(e) => e.key === "Enter" && handleRepurpose()}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Transcript
              <span className="text-muted-foreground font-normal ml-1">
                (paste directly to skip fetching - e.g. from Shorts tab)
              </span>
            </label>
            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste video transcript here..."
              rows={4}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Repurpose to
            </label>
            <div className="flex gap-2 flex-wrap">
              {PLATFORMS.map((platform) => {
                const selected = selectedPlatforms.includes(platform.id);
                const Icon = platform.icon;
                return (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                      selected
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        selected && platform.color
                      )}
                    />
                    {platform.label}
                    {platform.badge && selected && (
                      <Badge variant="outline" className="text-xs ml-1">
                        {platform.badge}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            onClick={handleRepurpose}
            disabled={
              loading || (!url.trim() && !transcript.trim()) || selectedPlatforms.length === 0
            }
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating content + slides...
              </>
            ) : (
              <>
                <Repeat2 className="h-4 w-4 mr-2" />
                Repurpose Video
              </>
            )}
          </Button>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Video Info */}
      {videoInfo && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3 text-sm">
              <Play className="h-4 w-4 text-red-400 shrink-0" />
              <span className="font-medium">{videoInfo.title}</span>
              <span className="text-muted-foreground">
                {videoInfo.views.toLocaleString()} views
              </span>
              {videoInfo.hasTranscript && (
                <Badge
                  variant="outline"
                  className="text-xs text-green-400 border-green-500/30"
                >
                  transcript
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {hasResults && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Generated Content</h2>
            {hasDrafts && (
              <Button onClick={publishAll}>
                <Send className="h-4 w-4 mr-2" />
                Publish All
              </Button>
            )}
          </div>

          {/* Platform sections */}
          {Object.entries(results).map(([platform, result]) => {
            const meta = platformMeta(platform);
            const Icon = meta.icon;
            const accs = platformAccounts[platform] || [];

            return (
              <Card
                key={platform}
                className={cn(
                  result.status === "published" && "border-green-500/30",
                  result.status === "failed" && "border-red-500/30"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Icon className={cn("h-4 w-4", meta.color)} />
                      {meta.label}
                      {(result.slides?.length ?? 0) > 0 && (
                        <Badge
                          variant="outline"
                          className="text-xs border-blue-500/30 text-blue-400"
                        >
                          {result.slides!.length} slides
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {result.status === "published" && (
                        <Badge className="bg-green-500/20 text-green-400 border-0">
                          <Check className="h-3 w-3 mr-1" />
                          Published
                        </Badge>
                      )}
                      {result.status === "publishing" && (
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-0">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Publishing...
                        </Badge>
                      )}
                      {result.status === "failed" && (
                        <Badge className="bg-red-500/20 text-red-400 border-0">
                          Failed
                        </Badge>
                      )}
                      {result.publicUrl && (
                        <a
                          href={result.publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </a>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(platform, result.text)
                        }
                      >
                        {copiedPlatform === platform ? (
                          <>
                            <Check className="h-3 w-3 mr-1 text-green-400" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="pt-4 space-y-4">
                  {result.error && (
                    <p className="text-sm text-destructive">
                      {result.error}
                    </p>
                  )}

                  {/* Text content */}
                  <Textarea
                    value={result.text}
                    onChange={(e) => updateText(platform, e.target.value)}
                    rows={platform === "x" ? 3 : 8}
                    className="font-sans text-sm"
                    disabled={result.status !== "draft"}
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{result.text.length} characters</span>
                    {platform === "x" && result.text.length > 280 && (
                      <span className="text-red-400 font-medium">
                        Over 280 char limit!
                      </span>
                    )}
                  </div>

                  {/* Carousel Slides */}
                  {(result.slides?.length ?? 0) > 0 && (() => {
                    const slides = result.slides!;
                    const cur = currentSlides[platform] || 0;
                    const setCur = (i: number) =>
                      setCurrentSlides((prev) => ({ ...prev, [platform]: i }));
                    return (
                      <>
                        <Separator />
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium">
                              Carousel Slides
                            </h3>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadSlides(platform)}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              PNGs
                            </Button>
                          </div>

                          <div className="flex gap-2 overflow-x-auto pb-2">
                            {slides.map((slide, i) => (
                              <button
                                key={i}
                                onClick={() => setCur(i)}
                                className={cn(
                                  "shrink-0 rounded-lg overflow-hidden border-2 transition-colors",
                                  i === cur
                                    ? "border-primary"
                                    : "border-transparent hover:border-border"
                                )}
                              >
                                <CarouselSlide slide={slide} index={i} total={slides.length} preview previewScale={90 / 1080} />
                              </button>
                            ))}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                            <div className="flex justify-center">
                                <CarouselSlide slide={slides[cur]} index={cur} total={slides.length} preview previewScale={216 / 1080} />
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                  Slide {cur + 1} / {slides.length} - {slides[cur].type}
                                </span>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => setCur(Math.max(0, cur - 1))} disabled={cur === 0}>
                                    <ChevronLeft className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => setCur(Math.min(slides.length - 1, cur + 1))} disabled={cur === slides.length - 1}>
                                    <ChevronRight className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <Input
                                value={slides[cur].heading}
                                onChange={(e) => updateSlide(platform, cur, { heading: e.target.value })}
                                placeholder="Heading"
                                className="text-xs"
                              />
                              {slides[cur].body !== undefined && (
                                <Textarea
                                  value={slides[cur].body || ""}
                                  onChange={(e) => updateSlide(platform, cur, { body: e.target.value })}
                                  placeholder="Body text"
                                  rows={2}
                                  className="text-xs"
                                />
                              )}
                              {slides[cur].callout !== undefined && (
                                <Input
                                  value={slides[cur].callout || ""}
                                  onChange={(e) => updateSlide(platform, cur, { callout: e.target.value })}
                                  placeholder="Callout box"
                                  className="text-xs"
                                />
                              )}
                              <p className="text-xs text-muted-foreground">*word* for blue accent</p>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  {/* Account + Publish */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">
                        Account:
                      </label>
                      {accs.length > 0 ? (
                        <select
                          className="bg-transparent border border-border rounded-md px-2 py-1 text-xs"
                          value={selectedAccounts[platform] || ""}
                          onChange={(e) =>
                            setSelectedAccounts((prev) => ({
                              ...prev,
                              [platform]: e.target.value,
                            }))
                          }
                          disabled={result.status !== "draft"}
                        >
                          {accs.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.displayName} ({acc.username})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No account connected
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="datetime-local"
                        className="bg-transparent border border-border rounded-md px-2 py-1 text-xs"
                        value={scheduledTimes[platform] || ""}
                        onChange={(e) =>
                          setScheduledTimes((prev) => ({
                            ...prev,
                            [platform]: e.target.value,
                          }))
                        }
                        disabled={result.status !== "draft"}
                      />
                      {result.status === "draft" &&
                        selectedAccounts[platform] && (
                          <Button
                            size="sm"
                            onClick={() => publishPlatform(platform)}
                          >
                            <Send className="h-3 w-3 mr-1" />
                            {scheduledTimes[platform] ? "Schedule" : "Publish"}
                            {(result.slides?.length ?? 0) > 0 &&
                              " with slides"}
                          </Button>
                        )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Hidden full-size slides for rendering, scoped per-platform */}
          <div
            ref={slidesRef}
            style={{ position: "absolute", left: -9999, top: 0 }}
          >
            {Object.entries(results).map(([platform, r]) => {
              if (!r.slides?.length) return null;
              return (
                <div key={platform} data-platform={platform}>
                  {r.slides.map((slide, i) => (
                    <CarouselSlide
                      key={`${platform}-${i}`}
                      slide={slide}
                      index={i}
                      total={r.slides!.length}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
