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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Clapperboard,
  Search,
  FileText,
  Type,
  Loader2,
  Check,
  ChevronDown,
  ChevronRight,
  Plus,
  RefreshCw,
  Star,
  ArrowRight,
  Send,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  VideoProject,
  ContentPillar,
  HookOption,
  TitleOption,
} from "@/lib/types";

const PILLARS: { value: ContentPillar; label: string }[] = [
  { value: "framework-adoption", label: "Framework Adoption" },
  { value: "build-business", label: "Build Business" },
  { value: "tutorial", label: "Tutorial" },
  { value: "use-cases", label: "Use Cases" },
  { value: "behind-scenes", label: "Behind the Scenes" },
];

const STEPS = [
  { key: "setup", label: "Topic & Setup", icon: Clapperboard },
  { key: "research", label: "Research", icon: Search },
  { key: "script", label: "Script", icon: FileText },
  { key: "titles", label: "Titles", icon: Type },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

function getStepStatus(
  step: StepKey,
  project: VideoProject | null
): "not-started" | "in-progress" | "done" {
  if (!project) return step === "setup" ? "not-started" : "not-started";

  switch (step) {
    case "setup":
      return "done";
    case "research":
      if (project.status === "researching") return "in-progress";
      if (project.research_brief) return "done";
      return "not-started";
    case "script":
      if (project.status === "scripting") return "in-progress";
      if (project.script) return "done";
      return "not-started";
    case "titles":
      if (project.titles) return "done";
      return "not-started";
  }
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function VideoCreationPage() {
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [activeProject, setActiveProject] = useState<VideoProject | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<StepKey>>(
    new Set(["setup"])
  );
  const [loading, setLoading] = useState<StepKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Setup form
  const [newTopic, setNewTopic] = useState("");
  const [newPillar, setNewPillar] = useState<ContentPillar | "">("");
  const [newLength, setNewLength] = useState("12");

  // Script display
  const [scriptData, setScriptData] = useState<{
    hookOptions: HookOption[];
    script: string;
    diagramRequests?: string[];
    brollList?: string[];
  } | null>(null);

  // Titles display
  const [titlesData, setTitlesData] = useState<TitleOption[] | null>(null);

  // Research display
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [researchBrief, setResearchBrief] = useState<Record<string, any> | null>(null);

  // Research chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Custom prompts for script and titles
  const [scriptPrompt, setScriptPrompt] = useState("");
  const [titlesPrompt, setTitlesPrompt] = useState("");

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/video/create");
      const data = await res.json();
      if (res.ok) setProjects(data.projects || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // When active project changes, populate display states
  useEffect(() => {
    if (activeProject) {
      if (activeProject.research_brief) {
        setResearchBrief(
          activeProject.research_brief as Record<string, unknown>
        );
      } else {
        setResearchBrief(null);
      }
      if (activeProject.script) {
        setScriptData({
          hookOptions: (activeProject.hook_options as HookOption[]) || [],
          script: activeProject.script,
        });
      } else {
        setScriptData(null);
      }
      if (activeProject.titles) {
        setTitlesData(activeProject.titles as TitleOption[]);
      } else {
        setTitlesData(null);
      }

      // Reset chat when switching projects
      setChatMessages([]);
      setChatInput("");
      setScriptPrompt("");
      setTitlesPrompt("");

      // Expand all sections that have data, plus the first empty one
      const toExpand = new Set<StepKey>();
      for (const step of STEPS) {
        const status = getStepStatus(step.key, activeProject);
        if (status === "done") toExpand.add(step.key);
      }
      // Always show at least one incomplete step
      const nextStep = STEPS.find(
        (s) => getStepStatus(s.key, activeProject) !== "done"
      );
      if (nextStep) toExpand.add(nextStep.key);
      setExpandedSteps(toExpand);
    }
  }, [activeProject]);

  const toggleStep = (step: StepKey) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(step)) {
        next.delete(step);
      } else {
        next.add(step);
      }
      return next;
    });
  };

  const selectProject = (project: VideoProject) => {
    setActiveProject(project);
    setError(null);
  };

  const createProject = async () => {
    if (!newTopic.trim()) return;
    setLoading("setup");
    setError(null);

    try {
      const res = await fetch("/api/video/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: newTopic,
          contentPillar: newPillar || null,
          targetLength: parseFloat(newLength) || 12,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }

      setActiveProject(data.project);
      setProjects((prev) => [data.project, ...prev]);
      setNewTopic("");
      setExpandedSteps(new Set(["research", "script", "titles"]));
    } catch {
      setError("Failed to create project");
    } finally {
      setLoading(null);
    }
  };

  const runResearch = async () => {
    if (!activeProject) return;
    setLoading("research");
    setError(null);

    try {
      const res = await fetch("/api/video/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: activeProject.id,
          topic: activeProject.topic,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }

      setResearchBrief(data.researchBrief);
      setActiveProject((prev) =>
        prev
          ? {
              ...prev,
              research_brief: data.researchBrief,
              status: "researched",
            }
          : null
      );
    } catch {
      setError("Failed to run research");
    } finally {
      setLoading(null);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);

    try {
      const res = await fetch("/api/video/research/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: activeProject?.topic || "",
          researchBrief,
          message: userMsg,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${data.error}` },
        ]);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Failed to get response" },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const generateScript = async () => {
    if (!activeProject) return;
    setLoading("script");
    setError(null);

    try {
      const res = await fetch("/api/video/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: activeProject.id,
          topic: activeProject.topic,
          researchBrief: researchBrief,
          targetLength: activeProject.target_length,
          contentPillar: activeProject.content_pillar,
          customPrompt: scriptPrompt.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }

      setScriptData(data.scriptData);
      setActiveProject((prev) =>
        prev
          ? {
              ...prev,
              script: data.scriptData.script,
              hook_options: data.scriptData.hookOptions,
              status: "scripted",
            }
          : null
      );
    } catch {
      setError("Failed to generate script");
    } finally {
      setLoading(null);
    }
  };

  const generateTitles = async () => {
    if (!activeProject) return;
    setLoading("titles");
    setError(null);

    try {
      const res = await fetch("/api/video/titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: activeProject.id,
          topic: activeProject.topic,
          researchBrief: researchBrief,
          script: activeProject.script || scriptData?.script,
          customPrompt: titlesPrompt.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }

      setTitlesData(data.titlesData.titles);
      setActiveProject((prev) =>
        prev
          ? {
              ...prev,
              titles: data.titlesData.titles,
              status: "titles_done",
            }
          : null
      );
    } catch {
      setError("Failed to generate titles");
    } finally {
      setLoading(null);
    }
  };

  const statusBadge = (status: "not-started" | "in-progress" | "done") => {
    switch (status) {
      case "done":
        return (
          <Badge className="bg-green-500/20 text-green-400 border-0">
            <Check className="h-3 w-3 mr-1" />
            Done
          </Badge>
        );
      case "in-progress":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-0">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Running
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Ready
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Video Creation</h1>
        <p className="text-muted-foreground">
          Research, script, and title pipeline
        </p>
      </div>

      {/* Project Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium shrink-0">Project:</label>
            {projects.length > 0 ? (
              <select
                className="flex-1 bg-transparent border border-border rounded-md px-3 py-2 text-sm"
                value={activeProject?.id || ""}
                onChange={(e) => {
                  if (e.target.value === "") {
                    setActiveProject(null);
                    setResearchBrief(null);
                    setScriptData(null);
                    setTitlesData(null);
                    setChatMessages([]);
                    setExpandedSteps(new Set(["setup"]));
                  } else {
                    const p = projects.find((p) => p.id === e.target.value);
                    if (p) selectProject(p);
                  }
                }}
              >
                <option value="">+ New Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.topic} ({p.status})
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-muted-foreground">
                No projects yet - create one below
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Pipeline Steps */}
      {STEPS.map((step, i) => {
        const status = getStepStatus(step.key, activeProject);
        const isExpanded = expandedSteps.has(step.key);
        const Icon = step.icon;
        const isLoading = loading === step.key;

        return (
          <Card
            key={step.key}
            className={cn(
              status === "done" && "border-green-500/20",
              isLoading && "border-yellow-500/30"
            )}
          >
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => toggleStep(step.key)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-3">
                  <div
                    className={cn(
                      "flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold",
                      status === "done"
                        ? "bg-green-500/20 text-green-400"
                        : status === "in-progress"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {status === "done" ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <Icon className="h-4 w-4" />
                  {step.label}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {statusBadge(isLoading ? "in-progress" : status)}
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <>
                <Separator />
                <CardContent className="pt-4 space-y-4">
                  {/* Step 1: Setup */}
                  {step.key === "setup" && !activeProject && (
                    <>
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Video Topic / Idea
                        </label>
                        <Textarea
                          value={newTopic}
                          onChange={(e) => setNewTopic(e.target.value)}
                          placeholder="Drop your video idea here... e.g., 'How to replace your entire tech stack with Claude Code' or 'I built a SaaS in 2 hours with AI'"
                          rows={3}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Content Pillar
                          </label>
                          <select
                            className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm"
                            value={newPillar}
                            onChange={(e) =>
                              setNewPillar(e.target.value as ContentPillar)
                            }
                          >
                            <option value="">Auto-detect</option>
                            {PILLARS.map((p) => (
                              <option key={p.value} value={p.value}>
                                {p.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Target Length (minutes)
                          </label>
                          <Input
                            type="number"
                            value={newLength}
                            onChange={(e) => setNewLength(e.target.value)}
                            min="3"
                            max="60"
                          />
                        </div>
                      </div>
                      <Button
                        onClick={createProject}
                        disabled={!newTopic.trim() || isLoading}
                        className="w-full"
                        size="lg"
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4 mr-2" />
                        )}
                        Create Video Project
                      </Button>
                    </>
                  )}

                  {step.key === "setup" && activeProject && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <span className="text-xs text-muted-foreground">
                          Topic
                        </span>
                        <p className="text-sm font-medium">
                          {activeProject.topic}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">
                          Pillar
                        </span>
                        <p className="text-sm font-medium">
                          {activeProject.content_pillar || "Auto-detect"}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">
                          Target Length
                        </span>
                        <p className="text-sm font-medium">
                          {activeProject.target_length} min
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Research */}
                  {step.key === "research" && activeProject && (
                    <>
                      {!researchBrief && (
                        <Button
                          onClick={runResearch}
                          disabled={isLoading}
                          className="w-full"
                          size="lg"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Researching competitors...
                            </>
                          ) : (
                            <>
                              <Search className="h-4 w-4 mr-2" />
                              Run Competitor Research
                            </>
                          )}
                        </Button>
                      )}

                      {researchBrief && (
                        <div className="space-y-4">
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={runResearch}
                              disabled={isLoading}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Re-run
                            </Button>
                          </div>

                          {/* Summary */}
                          {researchBrief.summary && (
                            <div className="p-3 rounded-md bg-muted/50">
                              <p className="text-sm">
                                {researchBrief.summary as string}
                              </p>
                            </div>
                          )}

                          {/* Blue Ocean Angle */}
                          {researchBrief.blueOceanAngle && (
                            <div className="p-3 rounded-md bg-blue-500/10 border border-blue-500/20">
                              <span className="text-xs font-medium text-blue-400">
                                Blue Ocean Angle
                              </span>
                              <p className="text-sm mt-1">
                                {researchBrief.blueOceanAngle as string}
                              </p>
                            </div>
                          )}

                          {/* Content Gaps */}
                          {Array.isArray(researchBrief.contentGaps) &&
                            (researchBrief.contentGaps as string[]).length >
                              0 && (
                              <div>
                                <span className="text-xs font-medium text-muted-foreground">
                                  Content Gaps
                                </span>
                                <ul className="mt-1 space-y-1">
                                  {(researchBrief.contentGaps as string[]).map(
                                    (gap, i) => (
                                      <li
                                        key={i}
                                        className="text-sm flex items-start gap-2"
                                      >
                                        <ArrowRight className="h-3 w-3 mt-1 text-green-400 shrink-0" />
                                        {gap}
                                      </li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}

                          {/* Top Competitors */}
                          {Array.isArray(researchBrief.topCompetitors) &&
                            (
                              researchBrief.topCompetitors as {
                                title: string;
                                channel: string;
                                views: number;
                              }[]
                            ).length > 0 && (
                              <div>
                                <span className="text-xs font-medium text-muted-foreground">
                                  Top Competitors
                                </span>
                                <div className="mt-1 space-y-1">
                                  {(
                                    researchBrief.topCompetitors as {
                                      title: string;
                                      channel: string;
                                      views: number;
                                    }[]
                                  )
                                    .slice(0, 8)
                                    .map((comp, i) => (
                                      <div
                                        key={i}
                                        className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/30"
                                      >
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium truncate">
                                            {comp.title}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {comp.channel}
                                          </p>
                                        </div>
                                        <span className="text-xs text-muted-foreground shrink-0 ml-2">
                                          {comp.views?.toLocaleString()} views
                                        </span>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}

                          {/* Viewer Pain Points */}
                          {Array.isArray(researchBrief.viewerPainPoints) &&
                            (researchBrief.viewerPainPoints as string[])
                              .length > 0 && (
                              <div>
                                <span className="text-xs font-medium text-muted-foreground">
                                  Viewer Pain Points
                                </span>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {(
                                    researchBrief.viewerPainPoints as string[]
                                  ).map((point, i) => (
                                    <Badge
                                      key={i}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {point}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                          {/* Recommended Hooks */}
                          {Array.isArray(researchBrief.recommendedHooks) &&
                            (researchBrief.recommendedHooks as string[])
                              .length > 0 && (
                              <div>
                                <span className="text-xs font-medium text-muted-foreground">
                                  Recommended Hooks
                                </span>
                                <ul className="mt-1 space-y-1">
                                  {(
                                    researchBrief.recommendedHooks as string[]
                                  ).map((hook, i) => (
                                    <li key={i} className="text-sm italic">
                                      &ldquo;{hook}&rdquo;
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                          {/* Research Chat */}
                          <Separator />
                          <div>
                            <span className="text-xs font-medium text-muted-foreground">
                              Explore Ideas
                            </span>
                            <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                              Ask follow-up questions, elaborate on ideas, or explore angles. Copy responses to use as prompts for script or title generation.
                            </p>

                            {/* Chat messages */}
                            {chatMessages.length > 0 && (
                              <div className="space-y-3 mb-3 max-h-96 overflow-y-auto">
                                {chatMessages.map((msg, i) => (
                                  <div
                                    key={i}
                                    className={cn(
                                      "p-3 rounded-md text-sm",
                                      msg.role === "user"
                                        ? "bg-primary/10 border border-primary/20"
                                        : "bg-muted/50"
                                    )}
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-medium text-muted-foreground">
                                        {msg.role === "user" ? "You" : "Strategist"}
                                      </span>
                                      {msg.role === "assistant" && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-2"
                                          onClick={() => copyToClipboard(msg.content)}
                                        >
                                          <Copy className="h-3 w-3 mr-1" />
                                          <span className="text-xs">Copy</span>
                                        </Button>
                                      )}
                                    </div>
                                    <div className="whitespace-pre-wrap">
                                      {msg.content}
                                    </div>
                                  </div>
                                ))}
                                {chatLoading && (
                                  <div className="p-3 rounded-md bg-muted/50 text-sm">
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Chat input */}
                            <div className="flex gap-2">
                              <Textarea
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Elaborate on the blue ocean angle... / What if we focused on X... / Give me 5 hook ideas for..."
                                rows={2}
                                className="flex-1"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                    e.preventDefault();
                                    sendChatMessage();
                                  }
                                }}
                              />
                              <Button
                                onClick={sendChatMessage}
                                disabled={!chatInput.trim() || chatLoading}
                                size="lg"
                                className="self-end"
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {step.key === "research" && !activeProject && (
                    <p className="text-sm text-muted-foreground">
                      Create a project first
                    </p>
                  )}

                  {/* Step 3: Script */}
                  {step.key === "script" && activeProject && (
                    <>
                      {/* Custom prompt input - always visible */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Instructions for Script Generation
                          <span className="text-muted-foreground font-normal ml-1">
                            (optional)
                          </span>
                        </label>
                        <Textarea
                          value={scriptPrompt}
                          onChange={(e) => setScriptPrompt(e.target.value)}
                          placeholder="Paste research insights, add specific angles, mention key points to cover... e.g., 'Focus on the before/after transformation. Mention the $36K/month agency milestone. Open with the photography analogy.'"
                          rows={3}
                        />
                      </div>

                      <Button
                        onClick={generateScript}
                        disabled={isLoading}
                        className="w-full"
                        size="lg"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Writing script...
                          </>
                        ) : (
                          <>
                            <FileText className="h-4 w-4 mr-2" />
                            {scriptData ? "Re-generate Script" : "Generate Script"}
                            {researchBrief && (
                              <Badge
                                variant="outline"
                                className="ml-2 text-xs"
                              >
                                with research
                              </Badge>
                            )}
                          </>
                        )}
                      </Button>

                      {scriptData && (
                        <div className="space-y-4">
                          {/* Hook Options */}
                          {scriptData.hookOptions?.length > 0 && (
                            <div>
                              <span className="text-xs font-medium text-muted-foreground">
                                Hook Options (pick one)
                              </span>
                              <div className="mt-2 space-y-2">
                                {scriptData.hookOptions.map(
                                  (hook: HookOption, i: number) => (
                                    <div
                                      key={i}
                                      className={cn(
                                        "p-3 rounded-md border cursor-pointer transition-colors",
                                        activeProject.selected_hook === i
                                          ? "border-primary bg-primary/5"
                                          : "border-border hover:border-foreground/30"
                                      )}
                                      onClick={() =>
                                        setActiveProject((prev) =>
                                          prev
                                            ? { ...prev, selected_hook: i }
                                            : null
                                        )
                                      }
                                    >
                                      <div className="flex items-center gap-2 mb-1">
                                        <Badge
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          {hook.type}
                                        </Badge>
                                        {activeProject.selected_hook === i && (
                                          <Star className="h-3 w-3 text-yellow-400" />
                                        )}
                                      </div>
                                      <p className="text-sm">{hook.text}</p>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                          {/* Full Script */}
                          <div>
                            <span className="text-xs font-medium text-muted-foreground">
                              Full Script
                            </span>
                            <Textarea
                              value={scriptData.script}
                              onChange={(e) =>
                                setScriptData((prev) =>
                                  prev
                                    ? { ...prev, script: e.target.value }
                                    : null
                                )
                              }
                              rows={20}
                              className="mt-2 font-mono text-xs"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              {scriptData.script.split(/\s+/).length} words -
                              ~
                              {Math.round(
                                scriptData.script.split(/\s+/).length / 150
                              )}{" "}
                              min
                            </p>
                          </div>

                          {/* Diagram Requests */}
                          {scriptData.diagramRequests &&
                            scriptData.diagramRequests.length > 0 && (
                              <div>
                                <span className="text-xs font-medium text-muted-foreground">
                                  Diagram Requests
                                </span>
                                <ul className="mt-1 space-y-1">
                                  {scriptData.diagramRequests.map(
                                    (d: string, i: number) => (
                                      <li
                                        key={i}
                                        className="text-sm flex items-start gap-2"
                                      >
                                        <span className="text-muted-foreground shrink-0">
                                          {i + 1}.
                                        </span>
                                        {d}
                                      </li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}
                        </div>
                      )}
                    </>
                  )}

                  {step.key === "script" && !activeProject && (
                    <p className="text-sm text-muted-foreground">
                      Create a project first
                    </p>
                  )}

                  {/* Step 4: Titles */}
                  {step.key === "titles" && activeProject && (
                    <>
                      {/* Custom prompt input - always visible */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Instructions for Title Generation
                          <span className="text-muted-foreground font-normal ml-1">
                            (optional)
                          </span>
                        </label>
                        <Textarea
                          value={titlesPrompt}
                          onChange={(e) => setTitlesPrompt(e.target.value)}
                          placeholder="Add specific direction... e.g., 'Make it more provocative. Include the word Claude. Target beginners who haven't tried AI yet.'"
                          rows={2}
                        />
                      </div>

                      <Button
                        onClick={generateTitles}
                        disabled={isLoading}
                        className="w-full"
                        size="lg"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating titles...
                          </>
                        ) : (
                          <>
                            <Type className="h-4 w-4 mr-2" />
                            {titlesData ? "Re-generate Titles" : "Generate Title Options"}
                            <div className="flex gap-1 ml-2">
                              {researchBrief && (
                                <Badge
                                  variant="outline"
                                  className="text-xs"
                                >
                                  + research
                                </Badge>
                              )}
                              {(scriptData || activeProject.script) && (
                                <Badge
                                  variant="outline"
                                  className="text-xs"
                                >
                                  + script
                                </Badge>
                              )}
                            </div>
                          </>
                        )}
                      </Button>

                      {titlesData && titlesData.length > 0 && (
                        <div className="space-y-3">
                          {titlesData.map((title: TitleOption, i: number) => (
                            <div
                              key={i}
                              className={cn(
                                "p-4 rounded-md border cursor-pointer transition-colors",
                                activeProject.selected_title === i
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-foreground/30"
                              )}
                              onClick={() =>
                                setActiveProject((prev) =>
                                  prev
                                    ? { ...prev, selected_title: i }
                                    : null
                                )
                              }
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-sm">
                                  {title.title}
                                </h3>
                                <div className="flex items-center gap-2">
                                  {activeProject.selected_title === i && (
                                    <Star className="h-3.5 w-3.5 text-yellow-400" />
                                  )}
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-xs",
                                      title.score >= 8
                                        ? "text-green-400 border-green-500/30"
                                        : title.score >= 6
                                          ? "text-yellow-400 border-yellow-500/30"
                                          : "text-red-400 border-red-500/30"
                                    )}
                                  >
                                    {title.score}/10
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {title.title.length} chars (first 40:{" "}
                                &ldquo;{title.title.slice(0, 40)}&rdquo;)
                              </p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                <Badge
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {title.formula}
                                </Badge>
                                {title.powerWords?.map((w: string) => (
                                  <Badge
                                    key={w}
                                    variant="outline"
                                    className="text-xs text-purple-400 border-purple-500/30"
                                  >
                                    {w}
                                  </Badge>
                                ))}
                              </div>
                              {title.thumbnailPairing && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Thumbnail:{" "}
                                  {title.thumbnailPairing}
                                </p>
                              )}
                              {title.whyItWorks && (
                                <p className="text-xs mt-1">
                                  {title.whyItWorks}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {step.key === "titles" && !activeProject && (
                    <p className="text-sm text-muted-foreground">
                      Create a project first
                    </p>
                  )}
                </CardContent>
              </>
            )}
          </Card>
        );
      })}
    </div>
  );
}
