import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Wallet,
  ListChecks,
  FileText,
  Sparkles,
  ArrowRight,
  Clock,
  TrendingUp,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

const fmt = (d) => {
  if (!d) return "";
  const dd = new Date(d);
  return dd.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};
const fmtTime = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};
const currency = (n, c = "USD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: c }).format(n || 0);

const Kpi = ({ label, value, hint, tone = "default", testid, icon: Icon }) => (
  <div className="card card-hover p-5" data-testid={testid}>
    <div className="flex items-center justify-between mb-3">
      <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500">{label}</div>
      {Icon && (
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            tone === "primary"
              ? "bg-indigo-500/15 text-indigo-300"
              : tone === "accent"
              ? "bg-emerald-500/15 text-emerald-300"
              : tone === "warn"
              ? "bg-amber-500/15 text-amber-300"
              : "bg-slate-500/15 text-slate-300"
          }`}
        >
          <Icon size={15} />
        </div>
      )}
    </div>
    <div className="font-display text-2xl font-bold">{value}</div>
    {hint && <div className="text-[12px] text-slate-500 mt-2">{hint}</div>}
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [greeting, setGreeting] = useState("Hello");
  const [planning, setPlanning] = useState(false);
  const [plan, setPlan] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get("/dashboard");
      setData(data);
    } catch (err) {
      console.error("Failed to load dashboard metrics:", err);
      toast.error("Unable to load dashboard data. Please check your connection.");
    }
  };

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(
      h < 5
        ? "Still up"
        : h < 12
        ? "Good morning"
        : h < 18
        ? "Good afternoon"
        : "Good evening"
    );
    load();
    const onRefresh = () => load();
    window.addEventListener("lifeos:refresh", onRefresh);
    return () => window.removeEventListener("lifeos:refresh", onRefresh);
  }, []);

  const toggleTask = async (t) => {
    try {
      const status = t.status === "done" ? "todo" : "done";
      await api.patch(`/tasks/${t.id}`, { status });
      load();
    } catch (err) {
      console.error("Failed to update task:", err);
      toast.error("Could not update task status");
    }
  };

  const generatePlan = async () => {
    setPlanning(true);
    try {
      const { data } = await api.post("/ai/plan-day");
      setPlan(data);
      toast.success("Daily plan generated");
    } catch (err) {
      console.error("AI daily planning error:", err);
      toast.error(
        err.response?.data?.error || "Could not generate AI plan right now. Please try again."
      );
    } finally {
      setPlanning(false);
    }
  };

  const c = data?.counts;
  const m = data?.money;

  return (
    <div className="p-5 md:p-8 max-w-[1400px] mx-auto" data-testid="dashboard-page">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold mt-2">
            {greeting}, {(user?.name || "there").split(" ")[0]}.
          </h1>
          <p className="text-slate-400 mt-2 max-w-xl">
            Here's your quiet snapshot for today — everything important, nothing noisy.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={generatePlan}
          disabled={planning}
          data-testid="plan-my-day-button"
        >
          <Sparkles size={15} /> {planning ? "Planning…" : "Plan my day"}
        </button>
      </div>

      {plan && (
        <div
          className="card p-6 mb-6 rise"
          style={{ borderColor: "rgba(99,102,241,0.4)" }}
          data-testid="ai-plan-card"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="chip chip-primary">
              <Sparkles size={12} /> Today's plan by LifeOS
            </div>
            <button
              className="btn btn-ghost !py-1 !px-2 text-xs"
              onClick={() => setPlan(null)}
            >
              Dismiss
            </button>
          </div>
          {plan.summary && <p className="text-slate-300 leading-relaxed">{plan.summary}</p>}
          {plan.focus?.length > 0 && (
            <div className="mt-4">
              <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500 mb-2">
                Focus
              </div>
              <ul className="space-y-1.5">
                {plan.focus.map((f, i) => (
                  <li key={i} className="text-sm text-slate-200 flex items-start gap-2">
                    <span className="text-indigo-400 font-mono">0{i + 1}.</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {plan.schedule?.length > 0 && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
              <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500 mb-2">
                Suggested Schedule
              </div>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                {plan.schedule.map((s, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-slate-900/60 border text-xs"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <span className="font-mono text-indigo-300 font-semibold">{s.time}</span>
                    <span className="text-slate-300 ml-2">{s.task}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Kpi
          label="Open Tasks"
          value={c?.open_tasks ?? "—"}
          hint={`${c?.due_today ?? 0} due today`}
          tone={c?.due_today > 0 ? "warn" : "primary"}
          testid="dashboard-kpi-tasks"
          icon={ListChecks}
        />
        <Kpi
          label="Upcoming Bills"
          value={c?.upcoming_bills ?? "—"}
          hint={currency(m?.total_owed || 0, m?.currency)}
          tone={c?.upcoming_bills > 0 ? "warn" : "default"}
          testid="dashboard-kpi-bills"
          icon={Wallet}
        />
        <Kpi
          label="Spent This Month"
          value={currency(m?.month_expense || 0, m?.currency)}
          hint="Across all categories"
          tone="accent"
          testid="dashboard-kpi-spend"
          icon={TrendingUp}
        />
        <Kpi
          label="Active Habits"
          value={c?.habits ?? "—"}
          hint="Tracked daily"
          tone="default"
          testid="dashboard-kpi-habits"
          icon={CalendarDays}
        />
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Due Today */}
          <div className="card p-5" data-testid="dashboard-due-today">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <h2 className="font-display font-bold text-lg">Due Today</h2>
              </div>
              <button
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                onClick={() => navigate("/tasks")}
              >
                View all tasks <ArrowRight size={13} />
              </button>
            </div>
            {(!data?.due_today || data.due_today.length === 0) && (
              <p className="text-sm text-slate-500 py-3">Nothing due today. Enjoy the clear space.</p>
            )}
            <div className="space-y-2">
              {data?.due_today?.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-slate-900/40"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleTask(t)}
                      className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        t.status === "done"
                          ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                          : "border-slate-600 hover:border-slate-400"
                      }`}
                    >
                      {t.status === "done" && <Check size={13} />}
                    </button>
                    <div>
                      <div className="text-sm font-medium text-slate-200">{t.title}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{t.category}</div>
                    </div>
                  </div>
                  <span
                    className={`chip ${
                      t.priority === "high"
                        ? "chip-danger"
                        : t.priority === "medium"
                        ? "chip-warn"
                        : ""
                    }`}
                  >
                    {t.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Bills */}
          <div className="card p-5" data-testid="dashboard-upcoming-bills">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-lg">Upcoming Bills (Next 30 Days)</h2>
              <button
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                onClick={() => navigate("/money")}
              >
                Money hub <ArrowRight size={13} />
              </button>
            </div>
            {(!data?.upcoming_bills || data.upcoming_bills.length === 0) && (
              <p className="text-sm text-slate-500 py-3">No bills due in the next 30 days.</p>
            )}
            <div className="space-y-2">
              {data?.upcoming_bills?.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-slate-900/40"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div>
                    <div className="text-sm font-medium text-slate-200">{b.name}</div>
                    <div className="text-[11px] text-slate-500">
                      Due {fmt(b.due_date)} · {b.days_until === 0 ? "today" : `in ${b.days_until}d`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-semibold text-slate-100">
                      {currency(b.amount, m?.currency)}
                    </div>
                    <span
                      className={`chip text-[10px] ${
                        b.days_until <= 3 ? "chip-danger" : b.days_until <= 7 ? "chip-warn" : ""
                      }`}
                    >
                      {b.frequency}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 col) */}
        <div className="space-y-6">
          {/* Next Appointment */}
          <div className="card p-5" data-testid="dashboard-next-appt">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-lg">Next Appointment</h2>
              <button
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                onClick={() => navigate("/calendar")}
              >
                Calendar <ArrowRight size={13} />
              </button>
            </div>
            {data?.next_appointment ? (
              <div
                className="p-4 rounded-xl border bg-slate-900/50"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-2 text-indigo-300 text-xs font-mono mb-1">
                  <Clock size={13} /> {fmt(data.next_appointment.starts_at)} ·{" "}
                  {fmtTime(data.next_appointment.starts_at)}
                </div>
                <div className="font-display font-bold text-base text-slate-100">
                  {data.next_appointment.title}
                </div>
                {data.next_appointment.location && (
                  <div className="text-xs text-slate-400 mt-1">
                    📍 {data.next_appointment.location}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500 py-3">No upcoming appointments on your schedule.</p>
            )}
          </div>

          {/* Expiring Documents */}
          <div className="card p-5" data-testid="dashboard-expiring-docs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-lg">Document Alerts</h2>
              <button
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                onClick={() => navigate("/more")}
              >
                Locker <ArrowRight size={13} />
              </button>
            </div>
            {(!data?.expiring_documents || data.expiring_documents.length === 0) && (
              <p className="text-sm text-slate-500 py-3">All stored documents are up to date.</p>
            )}
            <div className="space-y-2">
              {data?.expiring_documents?.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-slate-900/40"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="flex items-center gap-2.5">
                    <FileText size={16} className="text-amber-400" />
                    <div>
                      <div className="text-sm font-medium text-slate-200">{d.name}</div>
                      <div className="text-[11px] text-slate-500 capitalize">{d.type}</div>
                    </div>
                  </div>
                  <span
                    className={`chip ${
                      d.days_until <= 15
                        ? "chip-danger"
                        : d.days_until <= 30
                        ? "chip-warn"
                        : "chip-accent"
                    }`}
                  >
                    in {d.days_until}d
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
