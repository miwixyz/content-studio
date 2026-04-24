"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Script } from "@/lib/types";
import { ContentStatusBadge } from "@/components/dashboard/content-status";
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
import { Badge } from "@/components/ui/badge";
import { Plus, ExternalLink } from "lucide-react";

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTags, setNewTags] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const fetchScripts = useCallback(async () => {
    const { data } = await supabase
      .from("scripts")
      .select("*")
      .order("created_at", { ascending: false });
    setScripts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchScripts();
  }, [fetchScripts]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = newTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const tags = newTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    await supabase.from("scripts").insert({
      title: newTitle,
      slug,
      status: "draft",
      tags: tags.length > 0 ? tags : null,
      file_path: newNotes || null,
    });

    setNewTitle("");
    setNewTags("");
    setNewNotes("");
    setDialogOpen(false);
    fetchScripts();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase
      .from("scripts")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    fetchScripts();
  };

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
          <h1 className="text-2xl font-bold">Scripts</h1>
          <p className="text-muted-foreground">
            Manage video scripts and content briefs
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
              <Plus className="h-4 w-4 mr-2" />
              New Script
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Script</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., How to Build AI Agents with Claude Code"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Tags (comma-separated)
                </label>
                <Input
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="e.g., tutorial, claude-code, ai-first"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  File path (optional)
                </label>
                <Textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g., content/scripts/ai-agents/"
                  rows={2}
                />
              </div>
              <Button type="submit" className="w-full">
                Create Script
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            All Scripts ({scripts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scripts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No scripts yet. Create your first one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Words</TableHead>
                  <TableHead>Est. Minutes</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scripts.map((script) => (
                  <TableRow key={script.id}>
                    <TableCell className="font-medium">
                      {script.title}
                      {script.file_path && (
                        <ExternalLink className="inline h-3 w-3 ml-1 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      <ContentStatusBadge
                        status={script.status}
                        type="script"
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {script.word_count || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {script.estimated_minutes || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {script.tags?.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(script.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <select
                        className="bg-transparent border border-border rounded px-2 py-1 text-xs"
                        value={script.status}
                        onChange={(e) => updateStatus(script.id, e.target.value)}
                      >
                        <option value="draft">Draft</option>
                        <option value="review">Review</option>
                        <option value="approved">Approved</option>
                        <option value="recorded">Recorded</option>
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
