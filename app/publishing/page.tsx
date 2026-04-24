"use client";

import { useState } from "react";
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
  Upload,
  Loader2,
  Copy,
  Check,
  FileText,
  Tag,
  MessageSquare,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PublishResult {
  description: string;
  tags: string;
  promises: string[];
  pinnedComment: string;
}

export default function PublishingPage() {
  const [transcript, setTranscript] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PublishResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const generate = async () => {
    if (!transcript.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/video/publish-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, videoTitle }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to generate");
        return;
      }
      setResult(data.result);
    } catch {
      setError("Failed to connect to API");
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const CopyButton = ({ id, text }: { id: string; text: string }) => (
    <Button
      variant="outline"
      size="sm"
      onClick={() => copyText(id, text)}
    >
      {copied === id ? (
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
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Publishing</h1>
        <p className="text-muted-foreground">
          Generate description, tags, and pinned comment from your transcript
        </p>
      </div>

      {/* Input */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Video Title (optional)
            </label>
            <Input
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
              placeholder="e.g., I Built a Full LinkedIn Outreach Pipeline with Claude Code"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">
              Video Script or Transcript (with timestamps)
            </label>
            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder={`Paste your script or transcript here with timestamps...\n\n0:00\nOkay, so LinkedIn has over a billion members...\n0:45\nBefore we dive in, let me show you what we are building...`}
              rows={16}
              className="font-mono text-xs"
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">
                {transcript.length.toLocaleString()} characters -{" "}
                {transcript.split(/\s+/).filter(Boolean).length.toLocaleString()}{" "}
                words
              </p>
              {transcript.length > 0 && (
                <button
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setTranscript("")}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <Button
            onClick={generate}
            disabled={loading || !transcript.trim()}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing transcript...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Generate Publishing Assets
              </>
            )}
          </Button>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Generated Assets</h2>
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

          {/* Description */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-400" />
                  Video Description
                </CardTitle>
                <CopyButton id="description" text={result.description} />
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              <Textarea
                value={result.description}
                onChange={(e) =>
                  setResult((prev) =>
                    prev ? { ...prev, description: e.target.value } : null
                  )
                }
                rows={18}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {result.description.length.toLocaleString()} characters
              </p>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="h-4 w-4 text-purple-400" />
                  Video Tags
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs ml-1",
                      result.tags.length <= 500
                        ? "text-green-400 border-green-500/30"
                        : "text-red-400 border-red-500/30"
                    )}
                  >
                    {result.tags.length}/500 chars
                  </Badge>
                </CardTitle>
                <CopyButton id="tags" text={result.tags} />
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              <Textarea
                value={result.tags}
                onChange={(e) =>
                  setResult((prev) =>
                    prev ? { ...prev, tags: e.target.value } : null
                  )
                }
                rows={4}
                className="font-mono text-xs"
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {result.tags.split(",").map((tag, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-xs"
                  >
                    {tag.trim()}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Promises / Resources */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-400" />
                Promised in Video (include in description)
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              {result.promises && result.promises.length > 0 ? (
                <ul className="space-y-2">
                  {result.promises.map((promise, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm"
                    >
                      <span className="text-yellow-400 shrink-0 mt-0.5">
                        -
                      </span>
                      {promise}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No specific promises detected
                </p>
              )}
            </CardContent>
          </Card>

          {/* Pinned Comment */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-green-400" />
                  First Pinned Comment (CTA)
                </CardTitle>
                <CopyButton id="pinned" text={result.pinnedComment} />
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              <Textarea
                value={result.pinnedComment}
                onChange={(e) =>
                  setResult((prev) =>
                    prev
                      ? { ...prev, pinnedComment: e.target.value }
                      : null
                  )
                }
                rows={4}
                className="text-sm"
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
