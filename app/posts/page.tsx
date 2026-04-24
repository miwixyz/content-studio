"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Post, Platform, PostStatus } from "@/lib/types";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Plus, ExternalLink } from "lucide-react";

const PLATFORMS: Platform[] = [
  "youtube",
  "shorts",
  "linkedin",
  "x",
  "instagram",
  "tiktok",
];

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPlatform, setNewPlatform] = useState<Platform>("linkedin");
  const [newContent, setNewContent] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const fetchPosts = useCallback(async () => {
    const { data } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });
    setPosts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from("posts").insert({
      title: newTitle,
      platform: newPlatform,
      status: "draft",
      content: newContent || null,
    });
    setNewTitle("");
    setNewContent("");
    setDialogOpen(false);
    fetchPosts();
  };

  const updateStatus = async (id: string, status: PostStatus) => {
    await supabase.from("posts").update({ status }).eq("id", id);
    fetchPosts();
  };

  const filtered =
    filter === "all" ? posts : posts.filter((p) => p.platform === filter);

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
          <h1 className="text-2xl font-bold">Posts</h1>
          <p className="text-muted-foreground">
            Manage social media posts across platforms
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
              <Plus className="h-4 w-4 mr-2" />
              New Post
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Post</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Post title or description"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Platform</label>
                <select
                  className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm"
                  value={newPlatform}
                  onChange={(e) =>
                    setNewPlatform(e.target.value as Platform)
                  }
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Post content..."
                  rows={4}
                />
              </div>
              <Button type="submit" className="w-full">
                Create Post
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors",
            filter === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          All
        </button>
        {PLATFORMS.map((p) => (
          <button
            key={p}
            onClick={() => setFilter(p)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors",
              filter === p
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {p}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Posts ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No posts found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="font-medium">
                      {post.title}
                      {post.published_url && (
                        <a
                          href={post.published_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="inline h-3 w-3 ml-1 text-muted-foreground" />
                        </a>
                      )}
                    </TableCell>
                    <TableCell>
                      <PlatformBadge platform={post.platform} />
                    </TableCell>
                    <TableCell>
                      <ContentStatusBadge status={post.status} type="post" />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {post.published_at
                        ? new Date(post.published_at).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <select
                        className="bg-transparent border border-border rounded px-2 py-1 text-xs"
                        value={post.status}
                        onChange={(e) =>
                          updateStatus(
                            post.id,
                            e.target.value as PostStatus
                          )
                        }
                      >
                        <option value="draft">Draft</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="published">Published</option>
                      </select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
