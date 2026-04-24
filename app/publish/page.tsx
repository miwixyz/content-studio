"use client";

import { useCallback, useEffect, useState } from "react";
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
  Send,
  Sparkles,
  Check,
  Globe,
  Hash,
  Image,
  ExternalLink,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Account {
  id: string;
  platform: string;
  username: string;
  displayName: string;
  profileImageUrl?: string;
}

interface GeneratedPost {
  platform: string;
  text: string;
  accountId: string | null;
  status: "draft" | "publishing" | "published" | "failed";
  publicUrl?: string;
  error?: string;
}

const PLATFORM_META: Record<
  string,
  { label: string; icon: typeof Globe; color: string }
> = {
  linkedin: { label: "LinkedIn", icon: Globe, color: "text-blue-400" },
  twitter: { label: "X / Twitter", icon: Hash, color: "text-zinc-300" },
  instagram: { label: "Instagram", icon: Image, color: "text-pink-400" },
  facebook: { label: "Facebook", icon: Globe, color: "text-blue-300" },
};

const PLATFORM_API_MAP: Record<string, string> = {
  linkedin: "linkedin",
  twitter: "x",
  instagram: "instagram",
  facebook: "facebook",
};

export default function PublishPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [input, setInput] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [posts, setPosts] = useState<GeneratedPost[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/publish/accounts");
      const data = await res.json();
      if (res.ok) {
        setAccounts(data.accounts);
      } else {
        setError(data.error);
      }
    } catch {
      setError("Failed to fetch connected accounts");
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const platformAccounts = accounts.reduce(
    (acc, account) => {
      const platform = account.platform.replace("-page", "");
      if (!acc[platform]) acc[platform] = [];
      acc[platform].push(account);
      return acc;
    },
    {} as Record<string, Account[]>
  );

  const availablePlatforms = Object.keys(platformAccounts);

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleGenerate = async () => {
    if (!input.trim() || selectedPlatforms.length === 0) return;
    setGenerating(true);
    setError(null);
    setPosts([]);

    const generated: GeneratedPost[] = [];

    for (const platform of selectedPlatforms) {
      try {
        const apiPlatform = PLATFORM_API_MAP[platform] || platform;
        const res = await fetch("/api/publish/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input, platform: apiPlatform }),
        });
        const data = await res.json();

        if (res.ok) {
          // Auto-select first account for this platform
          const accs = platformAccounts[platform] || [];
          generated.push({
            platform,
            text: data.text,
            accountId: accs[0]?.id || null,
            status: "draft",
          });
        } else {
          generated.push({
            platform,
            text: "",
            accountId: null,
            status: "failed",
            error: data.error,
          });
        }
      } catch {
        generated.push({
          platform,
          text: "",
          accountId: null,
          status: "failed",
          error: "Generation failed",
        });
      }
    }

    setPosts(generated);
    setGenerating(false);
  };

  const updatePostText = (index: number, text: string) => {
    setPosts((prev) =>
      prev.map((p, i) => (i === index ? { ...p, text } : p))
    );
  };

  const updatePostAccount = (index: number, accountId: string) => {
    setPosts((prev) =>
      prev.map((p, i) => (i === index ? { ...p, accountId } : p))
    );
  };

  const publishPost = async (index: number) => {
    const post = posts[index];
    if (!post.accountId || !post.text) return;

    setPosts((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, status: "publishing" } : p
      )
    );

    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: post.accountId,
          text: post.text,
          platform: post.platform,
        }),
      });
      const data = await res.json();

      if (res.ok && data.status === "published") {
        setPosts((prev) =>
          prev.map((p, i) =>
            i === index
              ? { ...p, status: "published", publicUrl: data.publicUrl }
              : p
          )
        );
      } else if (res.ok && data.status === "pending") {
        setPosts((prev) =>
          prev.map((p, i) =>
            i === index
              ? { ...p, status: "published", publicUrl: undefined }
              : p
          )
        );
      } else {
        setPosts((prev) =>
          prev.map((p, i) =>
            i === index
              ? {
                  ...p,
                  status: "failed",
                  error: data.error || data.errorMessage || "Failed",
                }
              : p
          )
        );
      }
    } catch {
      setPosts((prev) =>
        prev.map((p, i) =>
          i === index
            ? { ...p, status: "failed", error: "Network error" }
            : p
        )
      );
    }
  };

  const publishAll = async () => {
    const drafts = posts
      .map((p, i) => ({ post: p, index: i }))
      .filter((x) => x.post.status === "draft" && x.post.accountId);

    for (const { index } of drafts) {
      await publishPost(index);
    }
  };

  const meta = (platform: string) =>
    PLATFORM_META[platform] || {
      label: platform,
      icon: Globe,
      color: "text-zinc-400",
    };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Publish</h1>
        <p className="text-muted-foreground">
          Generate and publish posts to your connected accounts
        </p>
      </div>

      {/* Input Section */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Content Source
            </label>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste a YouTube URL, article link, or type a topic..."
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Supports: YouTube URLs, article links, or raw text/topic
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Publish to
            </label>
            {loadingAccounts ? (
              <p className="text-sm text-muted-foreground">
                Loading connected accounts...
              </p>
            ) : availablePlatforms.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No connected accounts found. Connect accounts in Blotato
                first.
              </p>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {availablePlatforms.map((platform) => {
                  const m = meta(platform);
                  const Icon = m.icon;
                  const selected = selectedPlatforms.includes(platform);
                  const accountCount =
                    platformAccounts[platform]?.length || 0;
                  return (
                    <button
                      key={platform}
                      onClick={() => togglePlatform(platform)}
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
                          selected && m.color
                        )}
                      />
                      {m.label}
                      <Badge variant="outline" className="text-xs ml-1">
                        {accountCount}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <Button
            onClick={handleGenerate}
            disabled={
              generating ||
              !input.trim() ||
              selectedPlatforms.length === 0
            }
            className="w-full"
            size="lg"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating posts...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Posts
              </>
            )}
          </Button>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Posts */}
      {posts.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Generated Posts ({posts.length})
            </h2>
            {posts.some((p) => p.status === "draft" && p.accountId) && (
              <Button onClick={publishAll}>
                <Send className="h-4 w-4 mr-2" />
                Publish All
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {posts.map((post, index) => {
              const m = meta(post.platform);
              const Icon = m.icon;
              const accs = platformAccounts[post.platform] || [];

              return (
                <Card
                  key={index}
                  className={cn(
                    post.status === "published" && "border-green-500/30",
                    post.status === "failed" && "border-red-500/30"
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Icon className={cn("h-4 w-4", m.color)} />
                        {m.label}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {post.status === "published" && (
                          <Badge className="bg-green-500/20 text-green-400 border-0">
                            <Check className="h-3 w-3 mr-1" />
                            Published
                          </Badge>
                        )}
                        {post.status === "publishing" && (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-0">
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Publishing...
                          </Badge>
                        )}
                        {post.status === "failed" && (
                          <Badge className="bg-red-500/20 text-red-400 border-0">
                            Failed
                          </Badge>
                        )}
                        {post.publicUrl && (
                          <a
                            href={post.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="outline" size="sm">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <Separator />
                  <CardContent className="pt-4 space-y-3">
                    {post.error && (
                      <p className="text-sm text-destructive">
                        {post.error}
                      </p>
                    )}

                    <Textarea
                      value={post.text}
                      onChange={(e) =>
                        updatePostText(index, e.target.value)
                      }
                      rows={8}
                      className="font-sans text-sm"
                      disabled={post.status !== "draft"}
                    />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground">
                          Account:
                        </label>
                        <select
                          className="bg-transparent border border-border rounded-md px-2 py-1 text-sm"
                          value={post.accountId || ""}
                          onChange={(e) =>
                            updatePostAccount(index, e.target.value)
                          }
                          disabled={post.status !== "draft"}
                        >
                          <option value="">Select account</option>
                          {accs.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.displayName} ({acc.username})
                            </option>
                          ))}
                        </select>
                      </div>

                      {post.status === "draft" && post.accountId && (
                        <Button
                          size="sm"
                          onClick={() => publishPost(index)}
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Publish
                        </Button>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {post.text.length} characters
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
