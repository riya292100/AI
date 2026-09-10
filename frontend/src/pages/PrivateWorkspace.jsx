import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  FileLock2,
  FolderKanban,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  MessageSquareText,
  Plus,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Target,
  X,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPatch, apiPost, setAuthToken } from "../lib/api";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Toaster } from "../components/ui/sonner";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard-link", active: true, path: "/workspace" },
  { label: "Tasks", icon: FolderKanban, testId: "nav-tasks-link", active: false, path: "/tasks" },
  { label: "Finances", icon: CircleDollarSign, testId: "nav-finances-link", active: false, path: "/money" },
  { label: "Calendar", icon: CalendarDays, testId: "nav-calendar-link", active: false, path: "/calendar" },
  { label: "Documents", icon: FileLock2, testId: "nav-documents-link", active: false, path: "/more" },
  { label: "AI assistant", icon: MessageSquareText, testId: "nav-ai-assistant-link", active: false, path: "/assistant" },
  { label: "Security status", icon: ShieldCheck, testId: "nav-security-status-link", active: false, path: "#security" },
];

const priorityStyles = {
  high: "border-red-400/25 bg-red-400/10 text-red-300",
  medium: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  low: "border-blue-400/25 bg-blue-400/10 text-blue-300",
};

function SectionLabel({ children }) {
  return <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">{children}</p>;
}

function Sidebar({ onClose }) {
  const navigate = useNavigate();

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-white/10 bg-[#101723] px-5 py-6">
      <div className="mb-12 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" data-testid="brand-mark" onClick={() => navigate("/workspace")}>
          <div className="grid size-9 place-items-center rounded-xl bg-emerald-400 text-[#07110f] shadow-[0_0_24px_rgba(16,185,129,0.28)]">
            <ScanLine className="size-5" strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-heading text-lg font-semibold tracking-tight text-slate-100">LifeOS</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-emerald-400">private workspace</p>
          </div>
        </div>
        {onClose ? (
          <button
            data-testid="mobile-sidebar-close-button"
            className="text-slate-400 md:hidden"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        ) : null}
      </div>

      <SectionLabel>Workspace</SectionLabel>
      <nav className="mt-4 space-y-1" aria-label="Primary navigation">
        {navItems.map(({ label, icon: Icon, testId, active, path }) => (
          <a
            href={path}
            key={label}
            data-testid={testId}
            onClick={(event) => {
              event.preventDefault();
              if (path.startsWith("/")) {
                navigate(path);
              } else if (path === "#security") {
                const el = document.querySelector('[data-testid="arch-status-banner"]');
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }
              if (onClose) onClose();
            }}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-transform duration-150 hover:translate-x-0.5 ${
              active ? "bg-emerald-400/10 text-emerald-300" : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
            }`}
          >
            <Icon className={`size-4 ${active ? "text-emerald-300" : "text-slate-500 group-hover:text-slate-300"}`} />
            <span>{label}</span>
            {active ? <span className="ml-auto size-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.8)]" /> : null}
          </a>
        ))}
      </nav>

      <div className="mt-6 pt-4 border-t border-white/5">
        <button
          onClick={() => navigate("/")}
          className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-slate-400 hover:bg-white/5 hover:text-slate-200"
        >
          <span>Switch to Full LifeOS</span>
          <ExternalLink className="size-3.5 text-slate-500" />
        </button>
      </div>

      <div className="mt-auto rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4" data-testid="mocked-integrations-notice">
        <div className="mb-3 flex items-center gap-2 text-amber-300">
          <Activity className="size-4" />
          <SectionLabel>Preview mode</SectionLabel>
        </div>
        <p className="text-xs leading-relaxed text-slate-400">
          Identity and assistant providers are extension points in this preview.
        </p>
        <Badge variant="outline" className="mt-3 border-amber-400/30 font-mono text-[9px] uppercase tracking-[0.16em] text-amber-300">
          MOCKED
        </Badge>
      </div>
    </aside>
  );
}

function LoginScreen({ onLogin, isLoading }) {
  const navigate = useNavigate();

  return (
    <main className="relative flex min-h-svh items-center overflow-hidden bg-[#0b0f17] px-6 py-12 text-slate-100">
      <div className="pointer-events-none absolute -right-32 -top-32 size-[500px] rounded-full border border-emerald-400/10 bg-emerald-400/[0.03] blur-3xl" />
      <div className="mx-auto grid w-full max-w-5xl gap-14 lg:grid-cols-[1fr_420px] lg:items-center">
        <section className="relative z-10" data-testid="login-introduction">
          <div className="mb-7 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-emerald-400 text-[#07110f]">
              <ScanLine className="size-5" />
            </div>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-300">LifeOS / secure workspace</span>
          </div>
          <h1 className="max-w-xl font-heading text-5xl font-bold leading-[1.02] tracking-tight text-slate-50 sm:text-6xl">
            A calmer operating system for your life.
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-relaxed text-slate-400">
            Tasks, money, time, habits, and important documents — organized with privacy and control at the center.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2">
              <LockKeyhole className="size-3.5 text-emerald-300" /> HttpOnly sessions
            </span>
            <span className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2">
              <ShieldCheck className="size-3.5 text-emerald-300" /> User-scoped data
            </span>
          </div>
        </section>

        <Card className="relative z-10 border-white/10 bg-[#131b2a] shadow-2xl shadow-black/30" data-testid="login-card">
          <CardHeader className="p-7 pb-4">
            <SectionLabel>Access protocol</SectionLabel>
            <CardTitle className="mt-3 font-heading text-2xl text-slate-50" data-testid="login-card-title">
              Enter your workspace
            </CardTitle>
            <p className="text-sm leading-relaxed text-slate-400" data-testid="login-card-description">
              Use the controlled local fallback to explore the hardened dashboard.
            </p>
          </CardHeader>
          <CardContent className="p-7 pt-4">
            <Button
              data-testid="auth-demo-login-button"
              onClick={onLogin}
              disabled={isLoading}
              className="h-12 w-full bg-emerald-400 font-semibold text-[#07110f] hover:bg-emerald-300 hover:text-[#07110f]"
            >
              {isLoading ? "Opening secure session…" : "Continue to demo workspace"}
              <ArrowUpRight className="ml-2 size-4" />
            </Button>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-4"
              >
                Or sign in with password / Google account
              </button>
            </div>
            <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-slate-600" data-testid="login-mocked-label">
              MOCKED AUTH · NO LIVE CREDENTIALS
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

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
      } catch {
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
    onError: () => toast.error("Unable to open a session"),
  });

  const taskMutation = useMutation({
    mutationFn: (title) => apiPost("/tasks", { title, priority: "medium", due_date: null }),
    onSuccess: async () => {
      setNewTaskTitle("");
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      await queryClient.invalidateQueries({ queryKey: ["daily-review"] });
      toast.success("Task added to your workspace");
    },
    onError: () => toast.error("Task could not be saved"),
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
    onError: () => toast.error("This task changed elsewhere. Refresh and try again."),
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
    onError: () => toast.error("Module record could not be saved"),
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
    onError: () => toast.error("This record changed elsewhere. Refresh and try again."),
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
              <section className="grid gap-4 sm:grid-cols-3" aria-label="Workspace summary">
                <Card className="border-white/10 bg-[#131b2a]" data-testid="summary-tasks-card">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <SectionLabel>Open tasks</SectionLabel>
                      <FolderKanban className="size-4 text-emerald-300" />
                    </div>
                    <p className="mt-5 font-heading text-4xl font-semibold text-slate-50" data-testid="summary-open-tasks">
                      {tasks.length - completedCount}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">indexed to your account</p>
                  </CardContent>
                </Card>

                <Card className="border-white/10 bg-[#131b2a]" data-testid="summary-focus-card">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <SectionLabel>Focus completion</SectionLabel>
                      <Target className="size-4 text-amber-300" />
                    </div>
                    <p className="mt-5 font-heading text-4xl font-semibold text-slate-50" data-testid="summary-completion-rate">
                      {completionRate}%
                    </p>
                    <p className="mt-1 text-xs text-slate-500">this workspace snapshot</p>
                  </CardContent>
                </Card>

                <Card className="border-white/10 bg-[#131b2a]" data-testid="summary-security-card">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <SectionLabel>Data boundary</SectionLabel>
                      <LockKeyhole className="size-4 text-emerald-300" />
                    </div>
                    <p className="mt-5 font-heading text-2xl font-semibold text-emerald-300" data-testid="summary-data-boundary">
                      MongoDB
                    </p>
                    <p className="mt-1 text-xs text-slate-500">production source of truth</p>
                  </CardContent>
                </Card>
              </section>

              {/* Task Line & Architecture Posture */}
              <section className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,1fr)]">
                <Card className="border-white/10 bg-[#131b2a]" data-testid="tasks-panel">
                  <CardHeader className="flex flex-row items-start justify-between p-6 pb-2">
                    <div>
                      <SectionLabel>Today / execution</SectionLabel>
                      <CardTitle className="mt-2 font-heading text-2xl tracking-tight text-slate-50" data-testid="tasks-panel-title">
                        Your task line
                      </CardTitle>
                      <p className="mt-1 text-sm text-slate-500" data-testid="tasks-panel-description">
                        Small, owned actions that move the week forward.
                      </p>
                    </div>
                    <Badge variant="outline" className="border-white/10 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
                      {tasks.length} records
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-6 pt-5">
                    <form onSubmit={submitTask} className="mb-5 flex gap-2" data-testid="task-create-form">
                      <Input
                        data-testid="task-title-input"
                        value={newTaskTitle}
                        onChange={(event) => setNewTaskTitle(event.target.value)}
                        placeholder="Add a task to your line…"
                        className="h-11 border-white/10 bg-[#0b0f17] text-slate-100 placeholder:text-slate-600 focus-visible:ring-emerald-400/50"
                        maxLength={180}
                      />
                      <Button
                        type="submit"
                        data-testid="task-create-button"
                        disabled={!newTaskTitle.trim() || taskMutation.isPending}
                        className="h-11 shrink-0 bg-emerald-400 px-4 text-[#07110f] hover:bg-emerald-300 hover:text-[#07110f]"
                      >
                        <Plus className="size-4" />
                        <span className="hidden sm:inline">Add task</span>
                      </Button>
                    </form>

                    <div className="space-y-2" data-testid="task-list">
                      {tasksQuery.isPending ? (
                        <p className="py-8 text-sm text-slate-500" data-testid="task-list-loading">
                          Loading owned tasks…
                        </p>
                      ) : tasks.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-white/10 py-10 text-center" data-testid="task-list-empty">
                          <p className="text-sm text-slate-400">Your line is clear.</p>
                          <p className="mt-1 text-xs text-slate-600">Add the next useful action above.</p>
                        </div>
                      ) : (
                        tasks.map((task) => (
                          <div
                            key={task.id}
                            className="group flex items-center gap-3 rounded-lg border border-white/[0.07] bg-[#0f1622] p-3 transition-transform duration-150 hover:-translate-y-0.5 hover:border-emerald-400/30"
                            data-testid={`task-item-${task.id}`}
                          >
                            <button
                              type="button"
                              data-testid={`task-item-checkbox-${task.id}`}
                              onClick={() => toggleMutation.mutate(task)}
                              className={`grid size-5 shrink-0 place-items-center rounded-md border transition-transform duration-150 hover:scale-105 ${
                                task.completed
                                  ? "border-emerald-400 bg-emerald-400 text-[#07110f]"
                                  : "border-slate-600 text-transparent hover:border-emerald-400"
                              }`}
                              aria-label={task.completed ? `Mark ${task.title} incomplete` : `Mark ${task.title} complete`}
                            >
                              {task.completed ? <Check className="size-3.5" strokeWidth={3} /> : null}
                            </button>
                            <span
                              className={`min-w-0 flex-1 text-sm ${task.completed ? "text-slate-600 line-through" : "text-slate-200"}`}
                              data-testid={`task-item-title-${task.id}`}
                            >
                              {task.title}
                            </span>
                            <Badge
                              variant="outline"
                              className={`font-mono text-[9px] uppercase tracking-[0.13em] ${priorityStyles[task.priority] || priorityStyles.medium}`}
                              data-testid={`task-item-priority-${task.id}`}
                            >
                              {task.priority}
                            </Badge>
                            <ChevronRight className="size-4 text-slate-700 transition-transform group-hover:translate-x-0.5" />
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card className="border-emerald-400/20 bg-emerald-400/[0.06]" data-testid="arch-status-banner">
                    <CardHeader className="p-6 pb-2">
                      <div className="flex items-center justify-between">
                        <SectionLabel>Architecture posture</SectionLabel>
                        <BadgeCheck className="size-5 text-emerald-300" />
                      </div>
                      <CardTitle className="mt-2 font-heading text-xl text-slate-50" data-testid="arch-status-title">
                        Hardened baseline
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-3">
                      <div className="space-y-3 text-sm">
                        {[
                          "React 19 + Vite + strict TypeScript",
                          "FastAPI + Pydantic v2 contracts",
                          "MongoDB ownership filters + indexes",
                          "HttpOnly session + CSRF boundary",
                        ].map((item) => (
                          <div
                            className="flex items-center gap-2 text-slate-300"
                            key={item}
                            data-testid={`arch-status-item-${item.slice(0, 8).toLowerCase().replaceAll(" ", "-")}`}
                          >
                            <Check className="size-3.5 text-emerald-300" />
                            {item}
                          </div>
                        ))}
                      </div>
                      <p className="mt-5 border-t border-white/10 pt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-amber-300" data-testid="arch-status-mocked-note">
                        Firebase, AI, and private object storage are MOCKED / extension points
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </section>

              {/* Core Modules, Daily Review, AI, Documents */}
              <section className="grid gap-6 lg:grid-cols-3">
                {/* Core Modules Card */}
                <Card className="border-white/10 bg-[#131b2a]" data-testid="core-modules-card">
                  <CardHeader className="p-6 pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <SectionLabel>Core modules</SectionLabel>
                        <CardTitle className="mt-2 font-heading text-xl text-slate-50" data-testid="core-modules-title">
                          Keep the rest in view
                        </CardTitle>
                      </div>
                      <Badge variant="outline" className="border-white/10 font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400" data-testid="core-modules-count">
                        {workspaceItems.length} records
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-2">
                    <form onSubmit={submitModule} className="space-y-2" data-testid="core-module-create-form">
                      <Input
                        data-testid="module-title-input"
                        value={moduleTitle}
                        onChange={(event) => setModuleTitle(event.target.value)}
                        placeholder="Add a module record…"
                        className="border-white/10 bg-[#0b0f17] text-slate-100 placeholder:text-slate-600"
                        maxLength={180}
                      />
                      <div className="flex gap-2">
                        <select
                          data-testid="module-category-select"
                          value={moduleCategory}
                          onChange={(event) => setModuleCategory(event.target.value)}
                          className="h-10 min-w-0 flex-1 rounded-md border border-white/10 bg-[#0b0f17] px-3 text-xs text-slate-300 outline-none focus:border-emerald-400"
                        >
                          <option value="reminder">Reminder</option>
                          <option value="finance">Finance</option>
                          <option value="calendar">Calendar</option>
                          <option value="habit">Habit</option>
                          <option value="shopping">Shopping</option>
                        </select>
                        <Button
                          type="submit"
                          data-testid="module-create-button"
                          disabled={!moduleTitle.trim() || moduleMutation.isPending}
                          className="h-10 bg-emerald-400 px-3 text-[#07110f] hover:bg-emerald-300 hover:text-[#07110f]"
                        >
                          <Plus className="size-4" />
                        </Button>
                      </div>
                    </form>

                    <div className="mt-4 max-h-52 space-y-2 overflow-auto" data-testid="workspace-item-list">
                      {workspaceQuery.isPending ? (
                        <p className="py-4 text-xs text-slate-600" data-testid="workspace-item-loading">
                          Loading module records…
                        </p>
                      ) : workspaceItems.slice(0, 6).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 rounded-md border border-white/[0.07] bg-[#0f1622] p-2.5"
                          data-testid={`workspace-item-${item.id}`}
                        >
                          <button
                            type="button"
                            data-testid={`workspace-item-toggle-${item.id}`}
                            onClick={() => moduleToggleMutation.mutate(item)}
                            className={`grid size-4 shrink-0 place-items-center rounded border ${
                              item.status === "done"
                                ? "border-emerald-400 bg-emerald-400 text-[#07110f]"
                                : "border-slate-600 text-transparent"
                            }`}
                            aria-label={`Mark ${item.title} ${item.status === "done" ? "open" : "done"}`}
                          >
                            <Check className="size-3" />
                          </button>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`truncate text-xs ${item.status === "done" ? "text-slate-600 line-through" : "text-slate-300"}`}
                              data-testid={`workspace-item-title-${item.id}`}
                            >
                              {item.title}
                            </p>
                            <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-slate-600">{item.category}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Daily Review Card */}
                <Card className="border-amber-400/20 bg-amber-400/[0.05]" data-testid="daily-review-card">
                  <CardHeader className="p-6 pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <SectionLabel>Daily review</SectionLabel>
                        <CardTitle className="mt-2 font-heading text-xl text-slate-50" data-testid="daily-review-title">
                          A softer landing
                        </CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        data-testid="daily-review-refresh-button"
                        onClick={() => reviewQuery.refetch()}
                        aria-label="Refresh daily review"
                      >
                        <Activity className="size-4 text-amber-300" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-2">
                    {dailyReview ? (
                      <>
                        <div className="flex items-end justify-between">
                          <p className="font-heading text-3xl font-semibold text-amber-200" data-testid="daily-review-open-count">
                            {dailyReview.open_tasks + dailyReview.open_modules}
                          </p>
                          <Badge variant="outline" className="border-amber-400/20 font-mono text-[9px] uppercase tracking-[0.14em] text-amber-300" data-testid="daily-review-local-badge">
                            LOCAL / {dailyReview.date}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-slate-500" data-testid="daily-review-summary">
                          open threads across tasks and life modules
                        </p>
                        <div className="mt-4 space-y-2">
                          {dailyReview.next_actions.slice(0, 3).map((action, index) => (
                            <p key={`${action}-${index}`} className="flex gap-2 text-xs leading-relaxed text-slate-300" data-testid={`daily-review-next-action-${index}`}>
                              <span className="font-mono text-amber-300">0{index + 1}</span>
                              {action}
                            </p>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="py-6 text-xs text-slate-600" data-testid="daily-review-loading">
                        Generating local review…
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Scoped AI Assistant Card */}
                <Card className="border-white/10 bg-[#131b2a]" data-testid="ai-assistant-card">
                  <CardHeader className="p-6 pb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 text-amber-300" />
                      <SectionLabel>Scoped assistant</SectionLabel>
                    </div>
                    <CardTitle className="mt-2 font-heading text-xl text-slate-50" data-testid="ai-assistant-title">
                      Think with less noise
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-3">
                    <form onSubmit={submitAi} className="space-y-3" data-testid="ai-prompt-form">
                      <Input
                        data-testid="ai-prompt-input"
                        value={aiPrompt}
                        onChange={(event) => setAiPrompt(event.target.value)}
                        placeholder="Ask about your next move…"
                        className="border-white/10 bg-[#0b0f17] text-slate-100 placeholder:text-slate-600"
                      />
                      <Button
                        type="button"
                        onClick={sendAiPrompt}
                        variant="outline"
                        data-testid="ai-send-button"
                        className="w-full border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
                      >
                        <MessageSquareText className="mr-2 size-4" />
                        Ask assistant{" "}
                        <Badge variant="outline" className="ml-auto border-amber-400/20 font-mono text-[8px] text-amber-300">
                          MOCKED
                        </Badge>
                      </Button>
                    </form>
                    {aiNotice ? (
                      <p className="mt-3 text-xs leading-relaxed text-amber-300" data-testid="ai-mocked-status">
                        {aiNotice}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>

                {/* Private Documents Card */}
                <Card className="border-white/10 bg-[#131b2a]" data-testid="document-upload-card">
                  <CardHeader className="p-6 pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <SectionLabel>Private documents</SectionLabel>
                        <CardTitle className="mt-2 font-heading text-xl text-slate-50" data-testid="document-upload-title">
                          Keep important things close
                        </CardTitle>
                      </div>
                      <FileLock2 className="size-5 text-emerald-300" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-2">
                    <label
                      htmlFor="document-upload"
                      className="flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-white/15 bg-[#0f1622] p-4 transition-colors hover:border-emerald-400/40"
                      data-testid="document-upload-dropzone"
                    >
                      <span>
                        <span className="block text-sm text-slate-300">Upload a private document</span>
                        <span className="mt-1 block text-xs text-slate-600">Encrypted object storage connector pending</span>
                      </span>
                      <ArrowUpRight className="size-4 text-slate-500" />
                    </label>
                    <input
                      id="document-upload"
                      type="file"
                      className="sr-only"
                      data-testid="document-file-input"
                      onChange={() => {
                        setDocumentNotice("Document storage is an extension point");
                        toast("Document storage is an extension point", {
                          description: "No file was uploaded in MOCKED preview mode.",
                        });
                      }}
                    />
                    {documentNotice ? (
                      <p className="mt-3 text-xs leading-relaxed text-amber-300" data-testid="document-mocked-status">
                        {documentNotice}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
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

