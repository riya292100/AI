import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Wallet, ListChecks, FileText, Sparkles, ArrowRight, Clock, TrendingUp, AlertTriangle, Check } from "lucide-react";
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
const currency = (n, c = "USD") => new Intl.NumberFormat(undefined, { style: "currency", currency: c }).format(n || 0);

const Kpi = ({ label, value, hint, tone = "default", testid, icon: Icon }) => (
  <div className="card card-hover p-5" data-testid={testid}>
    <div className="flex items-center justify-between mb-3">
      <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500">{label}</div>
      {Icon && (
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tone === "primary" ? "bg-indigo-500/15 text-indigo-300" : tone === "accent" ? "bg-emerald-500/15 text-emerald-300" : tone === "warn" ? "bg-amber-500/15 text-amber-300" : "bg-slate-500/15 text-slate-300"}`}>
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
    } catch {}
  };

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
    load();
    const onRefresh = () => load();
    window.addEventListener("lifeos:refresh", onRefresh);
    return () => window.removeEventListener("lifeos:refresh", onRefresh);
  }, []);

  const toggleTask = async (t) => {
    const status = t.status === "done" ? "todo" : "done";
    await api.patch(`/tasks/${t.id}`, { status });
    load();
  };

  const generatePlan = async () => {
    setPlanning(true);
    try {
      const { data } = await api.post("/ai/plan-day");
      setPlan(data);
    } catch {
    } finally { setPlanning(false); }
  };

  const c = data?.counts;
  const m = data?.money;

  return (
    <div className="p-5 md:p-8 max-w-[1400px] mx-auto" data-testid="dashboard-page">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>
          <h1 className="font-display text-3xl md:text-4xl font-bold mt-2">{greeting}, {(user?.name || "there").split(" ")[0]}.</h1>
          <p className="text-slate-400 mt-2 max-w-xl">Here's your quiet snapshot for today — everything important, nothing noisy.</p>
        </div>
        <button className="btn btn-primary" onClick={generatePlan} disabled={planning} data-testid="plan-my-day-button">
          <Sparkles size={15} /> {planning ? "Planning…" : "Plan my day"}
        </button>
      </div>

      {plan && (
        <div className="card p-6 mb-6 rise" style={{ borderColor: "rgba(99,102,241,0.4)" }} data-testid="ai-plan-card">
          <div className="flex items-center justify-between mb-3">
            <div className="chip chip-primary"><Sparkles size={12} /> Today's plan by LifeOS</div>
            <button className="btn btn-ghost !py-1 !px-2 text-xs" onClick={() => setPlan(null)}>Dismiss</button>
          </div>
          {plan.summary && <p className="text-slate-300 leading-relaxed">{plan.summary}</p>}
          {plan.focus?.length > 0 && (
            <div className="mt-4">
              <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500 mb-2">Focus</div>
              <ul className="space-y-1.5">
                {plan.focus.map((f, i) => (
                  <li key={i} className="text-sm text-slate-200 flex items-start gap-2">
                    <Check size={14} className="text-emerald-400 mt-0.5 shrink-0" />{f}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {plan.schedule?.length > 0 && (
            <div className="mt-4">
              <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500 mb-2">Schedule</div>
              <div className="grid gap-2">
                {plan.schedule.map((s, i) => (
                  <div key={i} className="flex gap-3 items-center text-sm">
                    <span className="font-mono text-indigo-300 w-14">{s.time}</span>
                    <span className="text-slate-200">{s.task}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Kpi label="Open tasks" value={c?.open_tasks ?? "—"} hint={`${c?.due_today ?? 0} due today`} tone="primary" icon={ListChecks} testid="kpi-open-tasks" />
        <Kpi label="Bills next 30d" value={c?.upcoming_bills ?? "—"} hint={currency(m?.total_owed, m?.currency)} tone="warn" icon={Wallet} testid="kpi-bills" />
        <Kpi label="Spent this month" value={currency(m?.month_expense, m?.currency)} hint="All categories" tone="accent" icon={TrendingUp} testid="kpi-spent" />
        <Kpi label="Habits tracked" value={c?.habits ?? "—"} hint="Keep the streak" icon={CalendarDays} testid="kpi-habits" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <section className="card p-6" data-testid="due-today-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500">Due today</div>
                <div className="font-display font-bold text-lg mt-1">{(data?.due_today || []).length ? "Move these across the finish line" : "Clear runway — enjoy it"}</div>
              </div>
              <button className="btn btn-ghost !py-1.5 !px-2 text-[12px]" onClick={() => navigate("/tasks")} data-testid="view-all-tasks">
                View all <ArrowRight size={13} />
              </button>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {(data?.due_today || []).map((t) => (
                <div key={t.id} className="flex items-center gap-3 py-3">
                  <button onClick={() => toggleTask(t)} className="w-5 h-5 rounded border flex items-center justify-center text-emerald-400" style={{ borderColor: "var(--border-strong)" }} data-testid={`toggle-task-${t.id}`}>
                    {t.status === "done" && <Check size={13} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[14px] ${t.status === "done" ? "line-through text-slate-500" : "text-slate-100"}`}>{t.title}</div>
                    <div className="text-[11px] text-slate-500 font-mono uppercase tracking-wider mt-0.5">{t.category}</div>
                  </div>
                  <span className={`chip ${t.priority === "high" ? "chip-danger" : t.priority === "medium" ? "chip-warn" : ""}`}>{t.priority}</span>
                </div>
              ))}
              {(!data?.due_today || data.due_today.length === 0) && (
                <div className="py-6 text-center text-slate-500 text-sm">Nothing due today. Beautiful.</div>
              )}
            </div>
          </section>

          <section className="card p-6" data-testid="upcoming-bills-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500">Upcoming bills</div>
                <div className="font-display font-bold text-lg mt-1">Next 30 days</div>
              </div>
              <button className="btn btn-ghost !py-1.5 !px-2 text-[12px]" onClick={() => navigate("/money")} data-testid="view-money">
                Money <ArrowRight size={13} />
              </button>
            </div>
            <div className="space-y-2">
              {(data?.upcoming_bills || []).map((b) => (
                <div key={b.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-white/[0.03]">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${b.days_until <= 3 ? "bg-red-500/15 text-red-300" : b.days_until <= 7 ? "bg-amber-500/15 text-amber-300" : "bg-slate-500/15 text-slate-300"}`}>
                    <Wallet size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium">{b.name}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1"><Clock size={11} /> in {b.days_until} day{b.days_until === 1 ? "" : "s"} · {fmt(b.due_date)}</div>
                  </div>
                  <div className="font-display font-bold text-[15px]">{currency(b.amount, m?.currency)}</div>
                </div>
              ))}
              {(!data?.upcoming_bills || data.upcoming_bills.length === 0) && (
                <div className="py-6 text-center text-slate-500 text-sm">No bills coming up. 🎉</div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="card p-6" data-testid="next-appointment-card">
            <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500">Next up</div>
            {data?.next_appointment ? (
              <>
                <div className="font-display font-bold text-lg mt-2">{data.next_appointment.title}</div>
                <div className="text-sm text-slate-400 mt-1">{fmt(data.next_appointment.starts_at)} · {fmtTime(data.next_appointment.starts_at)}</div>
                {data.next_appointment.location && <div className="text-[13px] text-slate-500 mt-2">📍 {data.next_appointment.location}</div>}
                <button className="btn btn-ghost mt-4 !py-2" onClick={() => navigate("/calendar")}>Open calendar</button>
              </>
            ) : (
              <div className="text-sm text-slate-500 mt-3">No appointments coming up.</div>
            )}
          </section>

          <section className="card p-6" data-testid="expiring-docs-card">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={14} className="text-amber-300" />
              <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500">Expiring soon</div>
            </div>
            <div className="font-display font-bold text-lg">Documents to watch</div>
            <div className="mt-3 space-y-2">
              {(data?.expiring_documents || []).map((d) => (
                <div key={d.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/15 text-amber-300"><FileText size={14} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate">{d.name}</div>
                    <div className="text-[11px] text-slate-500">in {d.days_until} days</div>
                  </div>
                </div>
              ))}
              {(!data?.expiring_documents || data.expiring_documents.length === 0) && (
                <div className="text-sm text-slate-500">Nothing expiring soon.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
