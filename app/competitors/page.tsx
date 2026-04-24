"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { CompetitorProfile, CompetitorSnapshot } from "@/lib/types";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, TrendingUp } from "lucide-react";

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<CompetitorProfile[]>([]);
  const [snapshots, setSnapshots] = useState<CompetitorSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPlatform, setNewPlatform] = useState("youtube");
  const [newHandle, setNewHandle] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const fetchData = useCallback(async () => {
    const [compRes, snapRes] = await Promise.all([
      supabase
        .from("competitor_profiles")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("competitor_snapshots")
        .select("*")
        .order("snapshot_date", { ascending: false })
        .limit(50),
    ]);
    setCompetitors(compRes.data || []);
    setSnapshots(snapRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from("competitor_profiles").insert({
      name: newName,
      platform: newPlatform,
      handle: newHandle,
      url: newUrl || null,
    });
    setNewName("");
    setNewHandle("");
    setNewUrl("");
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("competitor_snapshots").delete().eq("competitor_id", id);
    await supabase.from("competitor_profiles").delete().eq("id", id);
    fetchData();
  };

  const getLatestSnapshot = (competitorId: string) => {
    return snapshots.find((s) => s.competitor_id === competitorId);
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
          <h1 className="text-2xl font-bold">Competitors</h1>
          <p className="text-muted-foreground">
            Track competitor channels and benchmark performance
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
              <Plus className="h-4 w-4 mr-2" />
              Add Competitor
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Competitor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Liam Ottley"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Platform</label>
                <select
                  className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm"
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value)}
                >
                  <option value="youtube">YouTube</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="x">X / Twitter</option>
                  <option value="instagram">Instagram</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Handle / Channel ID</label>
                <Input
                  value={newHandle}
                  onChange={(e) => setNewHandle(e.target.value)}
                  placeholder="e.g., @liamottley"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">URL (optional)</label>
                <Input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://youtube.com/@liamottley"
                />
              </div>
              <Button type="submit" className="w-full">
                Add Competitor
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Tracked Competitors ({competitors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {competitors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No competitors tracked yet. Add your first one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Handle</TableHead>
                  <TableHead>Followers</TableHead>
                  <TableHead>Avg Engagement</TableHead>
                  <TableHead>Last Snapshot</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {competitors.map((comp) => {
                  const snapshot = getLatestSnapshot(comp.id);
                  return (
                    <TableRow key={comp.id}>
                      <TableCell className="font-medium">
                        {comp.url ? (
                          <a
                            href={comp.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {comp.name}
                          </a>
                        ) : (
                          comp.name
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {comp.platform}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {comp.handle}
                      </TableCell>
                      <TableCell>
                        {snapshot?.followers?.toLocaleString() || "-"}
                      </TableCell>
                      <TableCell>
                        {snapshot?.avg_engagement != null ? (
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-green-400" />
                            {Number(snapshot.avg_engagement).toFixed(1)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {snapshot?.snapshot_date || "None"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(comp.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
