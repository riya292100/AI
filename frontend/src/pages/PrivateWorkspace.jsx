import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Menu, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPatch, apiPost, setAuthToken } from "../lib/api";
import { logError } from "../lib/logger";
import { Toaster } from "../components/ui/sonner";
import { Sidebar, SectionLabel } from "./workspace/Sidebar";
import { LoginScreen } from "./workspace/LoginScreen";
import { WorkspaceSummaryCards } from "./workspace/WorkspaceSummaryCards";
import { TaskLinePanel } from "./workspace/TaskLinePanel";
import { ArchitecturePostureCard } from "./workspace/ArchitecturePostureCard";
import {
  CoreModulesCard,
  DailyReviewCard,
  AiAssistantCard,
  DocumentUploadCard,
} from "./workspace/WorkspaceCards";

const fallbackQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

function PrivateWorkspaceInner() {
  const queryClient = useQueryClient();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiNotice, setAiNotice] = useState(null);
  const [documentNotice, setDocumentNotice] = useState(null);
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleCategory, setModuleCategory] = useState("reminder");

  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      try {
        const res = await apiGet("/auth/session");
        return res ?? null;
      } catch (err) {
        logError("PrivateWorkspace: sessionQuery error", err);
        return null;
      }
    },
    retry: false,
  });

  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const res = await apiGet("/tasks?limit=20&offset=0");
      return res ?? { items: [], total: 0, limit: 20, offset: 0 };
    },
    enabled: Boolean(sessionQuery.data),
    retry: false,
  });

  const workspaceQuery = useQuery({
    queryKey: ["workspace-items"],
    queryFn: async () => {
      const res = await apiGet("/workspace/items?limit=50&offset=0");
      return res ?? { items: [], total: 0, limit: 50, offset: 0 };
    },
    enabled: Boolean(sessionQuery.data),
    retry: false,
  });

  const reviewQuery = useQuery({
    queryKey: ["daily-review"],
    queryFn: async () => {
      const res = await apiGet("/review/today");
      return res ?? null;
    },
    enabled: Boolean(sessionQuery.data),
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiPost("/auth/demo-login", {});
      if (res?.token) {
        setAuthToken(res.token);
      }
      return res;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      await queryClient.invalidateQueries({ queryKey: ["workspace-items"] });
      await queryClient.invalidateQueries({ queryKey: ["daily-review"] });
      toast.success("Secure demo session opened");
    },
    onError: (err) => {
      logError("PrivateWorkspace: demo login error", err);
      toast.error("Unable to open a session");
    },
  });

  const taskMutation = useMutation({
    mutationFn: (title) => apiPost("/tasks", { title, priority: "medium", due_date: null }),
    onSuccess: async () => {
      setNewTaskTitle("");
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      await queryClient.invalidateQueries({ queryKey: ["daily-review"] });
      toast.success("Task added to your workspace");
    },
    onError: (err) => {
      logError("PrivateWorkspace: addTask error", err);
      toast.error("Task could not be saved");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (task) =>
      apiPatch(`/tasks/${task.id}`, {
        completed: !task.completed,
        version: task.version,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      await queryClient.invalidateQueries({ queryKey: ["daily-review"] });
    },
    onError: (err) => {
      logError("PrivateWorkspace: toggleTask error", err);
      toast.error("This task changed elsewhere. Refresh and try again.");
    },
  });

  const moduleMutation = useMutation({
    mutationFn: () =>
      apiPost("/workspace/items", {
        category: moduleCategory,
        title: moduleTitle.trim(),
      }),
    onSuccess: async () => {
      setModuleTitle("");
      await queryClient.invalidateQueries({ queryKey: ["workspace-items"] });
      await queryClient.invalidateQueries({ queryKey: ["daily-review"] });
      toast.success("Module record added");
    },
    onError: (err) => {
      logError("PrivateWorkspace: addModule error", err);
      toast.error("Module record could not be saved");
    },
  });

  const moduleToggleMutation = useMutation({
    mutationFn: (item) =>
      apiPatch(`/workspace/items/${item.id}`, {
        status: item.status === "done" ? "open" : "done",
        version: item.version,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workspace-items"] });
      await queryClient.invalidateQueries({ queryKey: ["daily-review"] });
    },
    onError: (err) => {
      logError("PrivateWorkspace: toggleModule error", err);
      toast.error("This record changed elsewhere. Refresh and try again.");
    },
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateViewport = () => setIsMobile(mediaQuery.matches);
    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  if (!sessionQuery.data) {
    return (
      <>
        <Toaster position="bottom-right" richColors />
        <LoginScreen onLogin={() => loginMutation.mutate()} isLoading={loginMutation.isPending} />
      </>
    );
  }

  const tasks = tasksQuery.data?.items ?? [];
  const workspaceItems = workspaceQuery.data?.items ?? [];
  const dailyReview = reviewQuery.data;
  const completedCount = tasks.filter((task) => task.completed).length;
  const completionRate = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  function submitTask(event) {
    event.preventDefault();
    if (newTaskTitle.trim()) taskMutation.mutate(newTaskTitle.trim());
  }

  function submitAi(event) {
    event.preventDefault();
    sendAiPrompt();
  }

  function sendAiPrompt() {
    if (!aiPrompt.trim()) return;
    toast("AI assistant is an extension point in this preview", {
      description: "Your prompt was not sent to an external provider.",
      icon: <Sparkles className="size-4 text-amber-300" />,
    });
    setAiNotice("AI assistant is an extension point in this preview");
    setAiPrompt("");
  }

  function submitModule(event) {
    event.preventDefault();
    if (moduleTitle.trim()) moduleMutation.mutate();
  }

  const displayName = sessionQuery.data.display_name || sessionQuery.data.email?.split("@")[0] || "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <Toaster position="bottom-right" richColors />
      <div className="min-h-svh bg-[#0b0f17] text-slate-100" data-testid="lifeos-dashboard">
        {mobileNavOpen && isMobile ? (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <button
              className="absolute inset-0 bg-black/60"
              data-testid="mobile-nav-backdrop-button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close menu"
            />
            <div className="relative z-10">
              <Sidebar onClose={() => setMobileNavOpen(false)} />
            </div>
          </div>
        ) : null}

        <div className="flex min-h-svh">
          {!isMobile ? (
            <div className="hidden md:block">
              <Sidebar />
            </div>
          ) : null}

          <div className="min-w-0 flex-1">
            <header
              className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-white/10 bg-[#0b0f17]/90 px-5 backdrop-blur-xl sm:px-8"
              data-testid="dashboard-header"
            >
              <div className="flex items-center gap-4">
                {isMobile ? (
                  <button
                    className="rounded-lg border border-white/10 p-2 text-slate-300 md:hidden"
                    data-testid="mobile-nav-open-button"
                    onClick={() => setMobileNavOpen(true)}
                    aria-label="Open menu"
                  >
                    <Menu className="size-5" />
                  </button>
                ) : null}
                <div>
                  <SectionLabel>Tuesday / personal command center</SectionLabel>
                  <h2 className="mt-1 font-heading text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl" data-testid="dashboard-heading">
                    Good morning, {displayName.split(" ")[0]}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2 sm:flex"
                  data-testid="security-indicator-pill"
                >
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-300" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-300">Session protected</span>
                </div>
                <div className="hidden text-right lg:block" data-testid="user-profile-badge">
                  <p className="text-xs font-medium text-slate-200">{sessionQuery.data.email}</p>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                    {sessionQuery.data.auth_mode || "MOCK"} identity
                  </p>
                </div>
                <div className="grid size-9 place-items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 font-mono text-xs text-emerald-300" aria-label="User profile">
                  {initials || "DU"}
                </div>
              </div>
            </header>

            <main className="mx-auto max-w-[1500px] space-y-6 px-5 py-7 sm:px-8 sm:py-9">
              {/* Summary KPIs */}
              <WorkspaceSummaryCards
                openTasksCount={tasks.length - completedCount}
                completionRate={completionRate}
              />

              {/* Task Line & Architecture Posture */}
              <section className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,1fr)]">
                <TaskLinePanel
                  tasks={tasks}
                  tasksQuery={tasksQuery}
                  newTaskTitle={newTaskTitle}
                  setNewTaskTitle={setNewTaskTitle}
                  taskMutation={taskMutation}
                  toggleMutation={toggleMutation}
                  submitTask={submitTask}
                />

                <div className="space-y-6">
                  <ArchitecturePostureCard />
                </div>
              </section>

              {/* Core Modules, Daily Review, AI, Documents */}
              <section className="grid gap-6 lg:grid-cols-3">
                <CoreModulesCard
                  workspaceItems={workspaceItems}
                  workspaceQuery={workspaceQuery}
                  moduleTitle={moduleTitle}
                  setModuleTitle={setModuleTitle}
                  moduleCategory={moduleCategory}
                  setModuleCategory={setModuleCategory}
                  submitModule={submitModule}
                  moduleMutation={moduleMutation}
                  moduleToggleMutation={moduleToggleMutation}
                />

                <DailyReviewCard
                  dailyReview={dailyReview}
                  reviewQuery={reviewQuery}
                />

                <AiAssistantCard
                  aiPrompt={aiPrompt}
                  setAiPrompt={setAiPrompt}
                  submitAi={submitAi}
                  sendAiPrompt={sendAiPrompt}
                  aiNotice={aiNotice}
                />

                <DocumentUploadCard
                  documentNotice={documentNotice}
                  setDocumentNotice={setDocumentNotice}
                />
              </section>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}

export default function PrivateWorkspace(props) {
  let hasClient = true;
  try {
    useQueryClient();
  } catch (_e) {
    hasClient = false;
  }
  if (!hasClient) {
    return (
      <QueryClientProvider client={fallbackQueryClient}>
        <PrivateWorkspaceInner {...props} />
      </QueryClientProvider>
    );
  }
  return <PrivateWorkspaceInner {...props} />;
}
