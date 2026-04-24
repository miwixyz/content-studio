const BLOTATO_BASE = "https://backend.blotato.com/v2";

function getApiKey() {
  return process.env.BLOTATO_API_KEY!;
}

function headers() {
  return {
    "blotato-api-key": getApiKey(),
    "Content-Type": "application/json",
  };
}

export interface BlotaAccount {
  id: string;
  platform: string;
  username: string;
  displayName: string;
  profileImageUrl?: string;
}

export interface PublishResult {
  postSubmissionId: string;
  status: string;
  publicUrl?: string;
  errorMessage?: string;
}

export async function getAccounts(): Promise<BlotaAccount[]> {
  const res = await fetch(`${BLOTATO_BASE}/users/me/accounts`, {
    headers: headers(),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch accounts: ${res.status}`);
  }
  const raw = await res.json();
  const data = Array.isArray(raw) ? raw : raw.items || [];

  // Also fetch subaccounts (company pages)
  const accounts: BlotaAccount[] = [];

  for (const acc of data) {
    accounts.push({
      id: acc.id,
      platform: acc.platform,
      username: acc.username || acc.displayName,
      displayName: acc.displayName || acc.username,
      profileImageUrl: acc.profileImageUrl,
    });

    // Check for subaccounts (Facebook pages, LinkedIn company pages)
    try {
      const subRes = await fetch(
        `${BLOTATO_BASE}/users/me/accounts/${acc.id}/subaccounts`,
        { headers: headers() }
      );
      if (subRes.ok) {
        const subData = await subRes.json();
        for (const sub of subData) {
          accounts.push({
            id: sub.id,
            platform: `${acc.platform}-page`,
            username: sub.username || sub.displayName,
            displayName: sub.displayName || sub.username,
            profileImageUrl: sub.profileImageUrl,
          });
        }
      }
    } catch {
      // Subaccounts not available for this platform
    }
  }

  return accounts;
}

export async function extractContent(
  sourceType: string,
  urlOrText: string
): Promise<{ content: string; title: string }> {
  const body: Record<string, unknown> = {
    source: {
      sourceType,
      ...(sourceType === "text" ? { text: urlOrText } : { url: urlOrText }),
    },
  };

  const res = await fetch(`${BLOTATO_BASE}/source-resolutions-v3`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Extraction failed: ${res.status}`);
  const { id } = await res.json();

  // Poll for completion
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const pollRes = await fetch(
      `${BLOTATO_BASE}/source-resolutions-v3/${id}`,
      { headers: headers() }
    );
    if (!pollRes.ok) continue;
    const pollData = await pollRes.json();
    if (pollData.status === "completed") {
      return {
        content: pollData.content || "",
        title: pollData.title || "",
      };
    }
    if (pollData.status === "failed") {
      throw new Error("Content extraction failed");
    }
  }
  throw new Error("Content extraction timed out");
}

/**
 * Upload media to Blotato's CDN so it can be used in posts.
 * Accepts a publicly accessible URL and returns a Blotato-hosted URL.
 */
export async function uploadMedia(sourceUrl: string): Promise<string> {
  const res = await fetch(`${BLOTATO_BASE}/media`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ url: sourceUrl }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Media upload failed: ${err}`);
  }

  const data = await res.json();
  return data.url;
}

export async function publishPost(params: {
  accountId: string;
  text: string;
  platform: string;
  mediaUrls?: string[];
  pageId?: string;
  scheduledTime?: string;
  title?: string;
}): Promise<PublishResult> {
  const target: Record<string, unknown> = {
    targetType: params.platform,
  };

  // Platform-specific required fields
  if (params.platform === "youtube") {
    target.title = params.title || params.text.slice(0, 100);
    target.privacyStatus = "public";
    target.shouldNotifySubscribers = true;
  }
  if (params.platform === "tiktok") {
    target.privacyLevel = "PUBLIC_TO_EVERYONE";
    target.disabledComments = false;
    target.disabledDuet = false;
    target.disabledStitch = false;
    target.isBrandedContent = false;
    target.isYourBrand = false;
    target.isAiGenerated = false;
  }
  if (params.platform === "instagram") {
    // Only set mediaType for video content (reel). For image posts/carousels, omit it.
    const hasVideo = params.mediaUrls?.some(
      (u) => /\.(mp4|mov|webm|avi)(\?|$)/i.test(u) || u.includes("video")
    );
    if (hasVideo) {
      target.mediaType = "reel";
    }
  }
  if (params.pageId) {
    target.pageId = params.pageId;
  }

  const body = {
    post: {
      accountId: params.accountId,
      content: {
        text: params.text,
        mediaUrls: params.mediaUrls || [],
        platform: params.platform,
      },
      target,
    },
    ...(params.scheduledTime
      ? { scheduledTime: params.scheduledTime, useNextFreeSlot: false }
      : { publishNow: true, useNextFreeSlot: false }),
  };

  const res = await fetch(`${BLOTATO_BASE}/posts`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Publish failed: ${err}`);
  }

  const data = await res.json();
  const postSubmissionId = data.postSubmissionId || data.id;

  // Poll for publish status
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const pollRes = await fetch(
        `${BLOTATO_BASE}/posts/${postSubmissionId}`,
        { headers: headers() }
      );
      if (!pollRes.ok) continue;
      const pollData = await pollRes.json();
      if (pollData.status === "published") {
        return {
          postSubmissionId,
          status: "published",
          publicUrl: pollData.publicUrl,
        };
      }
      if (pollData.status === "failed") {
        return {
          postSubmissionId,
          status: "failed",
          errorMessage: pollData.errorMessage || "Publishing failed",
        };
      }
    } catch {
      // Continue polling
    }
  }

  return {
    postSubmissionId,
    status: "pending",
  };
}
