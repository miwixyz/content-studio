"use client";

import { useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CarouselSlide,
  type SlideData,
} from "@/components/dashboard/carousel-slide";
import {
  Sparkles,
  Download,
  Upload,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toPng } from "html-to-image";

export default function SlidesPage() {
  const [input, setInput] = useState("");
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportedUrls, setExportedUrls] = useState<string[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const slidesContainerRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setGenerating(true);
    setError(null);
    setSlides([]);
    setExportedUrls([]);

    try {
      const res = await fetch("/api/publish/slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, slideCount: 7 }),
      });
      const data = await res.json();
      if (res.ok && data.slides) {
        setSlides(data.slides);
        setCurrentSlide(0);
      } else {
        setError(data.error || "Failed to generate slides");
      }
    } catch {
      setError("Failed to generate slides");
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async () => {
    if (!slidesContainerRef.current || slides.length === 0) return;
    setExporting(true);
    setExportedUrls([]);

    const urls: string[] = [];

    try {
      const slideElements =
        slidesContainerRef.current.querySelectorAll(".carousel-slide");

      for (let i = 0; i < slideElements.length; i++) {
        const el = slideElements[i] as HTMLElement;

        // Render to PNG
        const dataUrl = await toPng(el, {
          width: 1080,
          height: 1350,
          pixelRatio: 1,
        });

        // Convert data URL to blob
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], `slide-${i + 1}.png`, {
          type: "image/png",
        });

        // Upload to Catbox
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

      setExportedUrls(urls);
    } catch (err) {
      console.error("Export error:", err);
      setError("Failed to export slides");
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!slidesContainerRef.current || slides.length === 0) return;

    const slideElements =
      slidesContainerRef.current.querySelectorAll(".carousel-slide");

    for (let i = 0; i < slideElements.length; i++) {
      const el = slideElements[i] as HTMLElement;
      const dataUrl = await toPng(el, {
        width: 1080,
        height: 1350,
        pixelRatio: 1,
      });

      const link = document.createElement("a");
      link.download = `slide-${i + 1}.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  const updateSlide = (index: number, updates: Partial<SlideData>) => {
    setSlides((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...updates } : s))
    );
  };

  return (
    <div className="space-y-6">
      {/* Google Fonts for slide rendering */}
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <div>
        <h1 className="text-2xl font-bold">Slides</h1>
        <p className="text-muted-foreground">
          Generate LinkedIn carousel slides
        </p>
      </div>

      {/* Input */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Content source
            </label>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste a YouTube URL, article link, topic, or key points for the carousel..."
              rows={3}
            />
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generating || !input.trim()}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating slides...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate 7 Slides
              </>
            )}
          </Button>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Slide Preview */}
      {slides.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Preview ({slides.length} slides)
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownloadAll}>
                <Download className="h-4 w-4 mr-2" />
                Download PNGs
              </Button>
              <Button onClick={handleExport} disabled={exporting}>
                {exporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Export for Publishing
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Exported URLs */}
          {exportedUrls.length > 0 && (
            <Card className="border-green-500/30">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-green-400 font-medium mb-2">
                  Slides exported - {exportedUrls.length} images uploaded
                </p>
                <p className="text-xs text-muted-foreground">
                  These URLs are ready for Blotato publishing. Go to the
                  Publish page and attach them to a LinkedIn post.
                </p>
                <div className="mt-2 space-y-1">
                  {exportedUrls.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline block"
                    >
                      Slide {i + 1}: {url}
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Slide Navigator */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
              disabled={currentSlide === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex gap-1">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={cn(
                    "w-8 h-8 rounded-md text-xs font-medium transition-colors",
                    i === currentSlide
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentSlide(
                  Math.min(slides.length - 1, currentSlide + 1)
                )
              }
              disabled={currentSlide === slides.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Current Slide Preview + Edit */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Visual Preview */}
            <Card>
              <CardContent className="pt-4 flex justify-center overflow-hidden">
                <div
                  style={{
                    width: 270,
                    height: 337.5,
                    overflow: "hidden",
                  }}
                >
                  <CarouselSlide
                    slide={slides[currentSlide]}
                    index={currentSlide}
                    total={slides.length}
                    preview
                  />
                </div>
              </CardContent>
            </Card>

            {/* Edit Panel */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    Slide {currentSlide + 1} -{" "}
                    {slides[currentSlide].type}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setEditingIndex(
                        editingIndex === currentSlide
                          ? null
                          : currentSlide
                      )
                    }
                  >
                    {editingIndex === currentSlide ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Edit3 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">
                    Heading
                  </label>
                  <Input
                    value={slides[currentSlide].heading}
                    onChange={(e) =>
                      updateSlide(currentSlide, {
                        heading: e.target.value,
                      })
                    }
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Wrap words in *asterisks* for blue accent
                  </p>
                </div>
                {slides[currentSlide].subheading !== undefined && (
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Subheading
                    </label>
                    <Input
                      value={slides[currentSlide].subheading || ""}
                      onChange={(e) =>
                        updateSlide(currentSlide, {
                          subheading: e.target.value,
                        })
                      }
                      className="text-sm"
                    />
                  </div>
                )}
                {slides[currentSlide].body !== undefined && (
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Body
                    </label>
                    <Textarea
                      value={slides[currentSlide].body || ""}
                      onChange={(e) =>
                        updateSlide(currentSlide, {
                          body: e.target.value,
                        })
                      }
                      rows={3}
                      className="text-sm"
                    />
                  </div>
                )}
                {slides[currentSlide].callout !== undefined && (
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Callout (blue highlight box)
                    </label>
                    <Input
                      value={slides[currentSlide].callout || ""}
                      onChange={(e) =>
                        updateSlide(currentSlide, {
                          callout: e.target.value,
                        })
                      }
                      className="text-sm"
                    />
                  </div>
                )}
                {slides[currentSlide].type === "cta" && (
                  <>
                    <div>
                      <label className="text-xs text-muted-foreground">
                        Primary CTA
                      </label>
                      <Input
                        value={slides[currentSlide].cta_primary || ""}
                        onChange={(e) =>
                          updateSlide(currentSlide, {
                            cta_primary: e.target.value,
                          })
                        }
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">
                        Secondary CTA
                      </label>
                      <Input
                        value={slides[currentSlide].cta_secondary || ""}
                        onChange={(e) =>
                          updateSlide(currentSlide, {
                            cta_secondary: e.target.value,
                          })
                        }
                        className="text-sm"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Hidden full-size slides for rendering */}
          <div
            ref={slidesContainerRef}
            style={{
              position: "absolute",
              left: -9999,
              top: 0,
            }}
          >
            {slides.map((slide, i) => (
              <CarouselSlide
                key={i}
                slide={slide}
                index={i}
                total={slides.length}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
