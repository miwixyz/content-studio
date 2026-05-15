// ============================================================
// CONTENT STUDIO CONFIGURATION
// ============================================================
// Edit this file to personalize your Content Studio.
// Claude Code will guide you through this during setup.
// ============================================================

export const studio = {
  // --- Creator Identity ---
  creator: {
    name: "Your Name",
    channelName: "Your Channel",
    handle: "@your-handle",
    subscriberCount: "0",
    niche: "DJ & Orthopädie",
    nicheDescription: "Content rund um DJing und Orthopädie",
  },

  // --- Brand Voice ---
  voice: {
    tone: "casual and fun",
    rules: [
      "Locker, nahbar und unterhaltsam",
      "First-person, conversational",
      "Short paragraphs with line breaks",
      "No AI-sounding phrases like 'game-changer', 'revolutionary', 'let's dive in'",
    ],
  },

  // --- Links (shown in video descriptions, CTAs, etc.) ---
  links: {
    primary: "",
    primaryLabel: "",
    secondary: "",
    secondaryLabel: "",
  },

  // --- Video Description Template ---
  publishTemplate: {
    // This block goes at the TOP of every YouTube video description.
    // Leave empty if you don't want header links.
    descriptionHeader: "",
    // CTA for pinned comment under each video.
    pinnedCommentCTA: "",
  },

  // --- Carousel Slide Branding ---
  carousel: {
    brandName: "Your Brand",
    creatorFullName: "Your Name",
    handle: "@your-handle",
    accentColor: "#a11826",
    headshot: "/assets/headshot.png",
  },

  // --- Peer Channels to Track ---
  // Add YouTube channels you want to benchmark against.
  // Example: { name: "Creator Name", handle: "@creator", url: "https://www.youtube.com/@creator" }
  // Add isOwn: true for your own channel.
  peers: [] as { name: string; handle: string; url: string; isOwn?: boolean }[],

  // --- AI News Analysis ---
  newsAnalysis: {
    audienceDescription: "DJs, music producers, and music tech enthusiasts",
    focusTopics: ["DJ technology", "music production", "audio AI", "music tech"],
  },
};

// --- Helper: Build system prompt intro ---
export function creatorContext(): string {
  const { creator } = studio;
  return `"${creator.channelName}" (${creator.subscriberCount} subs, ${creator.niche} niche - ${creator.nicheDescription})`;
}

// --- Helper: Build voice rules string ---
export function voiceRules(): string {
  return studio.voice.rules.map((r) => `- ${r}`).join("\n");
}
