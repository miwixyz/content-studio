"use client";

import { useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ImageIcon,
  Loader2,
  Upload,
  X,
  Download,
  RefreshCw,
} from "lucide-react";

interface ThumbnailResult {
  imageUrl?: string;
  notes?: string | null;
  error?: string;
  index: number;
}

export default function ThumbnailsPage() {
  const [prompt, setPrompt] = useState("");
  const [reference, setReference] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [includeHeadshot, setIncludeHeadshot] = useState(false);
  const [count, setCount] = useState(4);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ThumbnailResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReference(file);
    const reader = new FileReader();
    reader.onload = (ev) => setReferencePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const clearReference = () => {
    setReference(null);
    setReferencePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const generate = async () => {
    if (!prompt.trim() && !reference) return;
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const formData = new FormData();
      if (prompt.trim()) formData.append("prompt", prompt.trim());
      if (reference) formData.append("reference", reference);
      formData.append("count", String(count));
      formData.append("includeHeadshot", String(includeHeadshot));

      const res = await fetch("/api/thumbnails/generate", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Generation failed");
        return;
      }

      setResults(data.thumbnails || []);
    } catch {
      setError("Failed to generate thumbnails");
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = (dataUrl: string, index: number) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `thumbnail-v${index}.png`;
    link.click();
  };

  const hasInput = prompt.trim() || reference;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Thumbnails</h1>
        <p className="text-muted-foreground">
          Generate YouTube thumbnail variations with Gemini
        </p>
      </div>

      {/* Input Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Generate Thumbnails
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4 space-y-4">
          {/* Text Prompt */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Text Prompt
              <span className="text-muted-foreground font-normal ml-1">
                (optional)
              </span>
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='Describe the thumbnail concept... e.g., "Claude Code replacing entire dev team, shocked expression, code on screens in background, text: REPLACED"'
              rows={3}
            />
          </div>

          {/* Reference Image */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Reference Image
              <span className="text-muted-foreground font-normal ml-1">
                (optional)
              </span>
            </label>

            {referencePreview ? (
              <div className="relative inline-block">
                <img
                  src={referencePreview}
                  alt="Reference"
                  className="h-32 rounded-md border border-border object-cover"
                />
                <button
                  onClick={clearReference}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-md p-6 text-center cursor-pointer hover:border-foreground/30 transition-colors"
              >
                <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Drop a reference thumbnail or click to browse
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Variation Count */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Variations
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={`h-9 w-9 rounded-md border text-sm font-medium transition-colors ${
                    count === n
                      ? "bg-foreground text-background border-foreground"
                      : "border-border hover:border-foreground/30"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Include Headshot Toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeHeadshot}
              onChange={(e) => setIncludeHeadshot(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <div>
              <span className="text-sm font-medium">Include my headshot</span>
              <p className="text-xs text-muted-foreground">
                Adds your face cutout to the thumbnail (right side)
              </p>
            </div>
          </label>

          {/* Generate Button */}
          <Button
            onClick={generate}
            disabled={!hasInput || loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating {count} variation{count > 1 ? "s" : ""}...
              </>
            ) : (
              <>
                <ImageIcon className="h-4 w-4 mr-2" />
                Generate {count} Variation{count > 1 ? "s" : ""}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Generated Thumbnails
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={generate}
                disabled={loading}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Re-generate
              </Button>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((result, i) => (
                <div
                  key={i}
                  className="rounded-md border border-border overflow-hidden"
                >
                  {result.imageUrl ? (
                    <>
                      <div className="relative group">
                        <img
                          src={result.imageUrl}
                          alt={`Thumbnail variation ${result.index}`}
                          className="w-full aspect-video object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() =>
                              downloadImage(result.imageUrl!, result.index)
                            }
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                      <div className="p-3 flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          Variation {result.index}
                        </Badge>
                        {result.notes && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              Notes
                            </summary>
                            <p className="mt-1 text-muted-foreground">
                              {result.notes}
                            </p>
                          </details>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="p-6 text-center">
                      <Badge
                        variant="outline"
                        className="text-xs text-red-400 border-red-500/30 mb-2"
                      >
                        Variation {result.index}
                      </Badge>
                      <p className="text-sm text-destructive">
                        {result.error || "Failed to generate"}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading skeleton */}
      {loading && results.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: count }, (_, i) => i + 1).map((i) => (
                <div
                  key={i}
                  className="rounded-md border border-border overflow-hidden"
                >
                  <div className="aspect-video bg-muted/50 animate-pulse flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        Variation {i}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
