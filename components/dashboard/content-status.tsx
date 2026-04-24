"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  type ContentStatus as ContentStatusType,
  type PostStatus,
  type ScriptStatus,
  STATUS_COLORS,
} from "@/lib/types";

const SCRIPT_STATUS_COLORS: Record<ScriptStatus, string> = {
  draft: "bg-zinc-500/20 text-zinc-400",
  review: "bg-yellow-500/20 text-yellow-400",
  approved: "bg-green-500/20 text-green-400",
  recorded: "bg-blue-500/20 text-blue-400",
};

const POST_STATUS_COLORS: Record<PostStatus, string> = {
  draft: "bg-zinc-500/20 text-zinc-400",
  scheduled: "bg-purple-500/20 text-purple-400",
  published: "bg-green-500/20 text-green-400",
};

interface ContentStatusBadgeProps {
  status: ContentStatusType | ScriptStatus | PostStatus;
  type?: "content" | "script" | "post";
}

export function ContentStatusBadge({
  status,
  type = "content",
}: ContentStatusBadgeProps) {
  const colorMap =
    type === "script"
      ? SCRIPT_STATUS_COLORS
      : type === "post"
        ? POST_STATUS_COLORS
        : STATUS_COLORS;
  const color = (colorMap as Record<string, string>)[status] || "";

  return (
    <Badge variant="outline" className={cn("capitalize border-0", color)}>
      {status}
    </Badge>
  );
}
