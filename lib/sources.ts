// News sources - YouTube channels to track for AI news
export const NEWS_YOUTUBE_CHANNELS = [
  {
    name: "Anthropic",
    handle: "@anthroploic",
    url: "https://www.youtube.com/@anthropic",
  },
  {
    name: "OpenAI",
    handle: "@OpenAI",
    url: "https://www.youtube.com/@OpenAI",
  },
  {
    name: "Google DeepMind",
    handle: "@GoogleDeepMind",
    url: "https://www.youtube.com/@GoogleDeepMind",
  },
  {
    name: "MrEflow",
    handle: "@mreflow",
    url: "https://www.youtube.com/@mreflow",
  },
];

// News sources - X/Twitter accounts to track
export const NEWS_TWITTER_ACCOUNTS = [
  // Official AI accounts
  { name: "Anthropic", handle: "@AnthropicAI", url: "https://x.com/AnthropicAI" },
  { name: "Claude AI", handle: "@claudeai", url: "https://x.com/claudeai" },
  { name: "Claude Code", handle: "@claudecodecli", url: "https://x.com/claudecodecli" },
  { name: "Boris Cherny", handle: "@AnywhichWayV", url: "https://x.com/AnywhichWayV", note: "Head of Claude Code" },
  // AI Researchers & Personalities
  { name: "Andrej Karpathy", handle: "@karpathy", url: "https://x.com/karpathy" },
  { name: "Yann LeCun", handle: "@ylecun", url: "https://x.com/ylecun" },
  { name: "Andrew Ng", handle: "@AndrewYNg", url: "https://x.com/AndrewYNg" },
  { name: "Ethan Mollick", handle: "@emollick", url: "https://x.com/emollick" },
  { name: "Sam Altman", handle: "@sama", url: "https://x.com/sama" },
  { name: "Demis Hassabis", handle: "@demishassabis", url: "https://x.com/demishassabis" },
  { name: "Fried Rice", handle: "@Fried_rice", url: "https://x.com/Fried_rice" },
];

// Peers - YouTube channels to benchmark against
// Configure your peer channels in config/studio.config.ts
import { studio } from "@/config/studio.config";
export const PEER_CHANNELS = studio.peers;
