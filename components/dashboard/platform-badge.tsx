"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type Platform, PLATFORM_COLORS } from "@/lib/types";

export function PlatformBadge({ platform }: { platform: Platform }) {
  return (
    <Badge
      variant="outline"
      className={cn("capitalize", PLATFORM_COLORS[platform])}
    >
      {platform}
    </Badge>
  );
}
