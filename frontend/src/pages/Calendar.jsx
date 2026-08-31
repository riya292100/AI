import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, MapPin, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";

const monthMatrix = (year, month) => {
  const first = new Date(year, month, 1);
  const startWeekday = (first.getDay() + 6) % 7; // Monday-first
  const days = [];
  for (let i = 0; i < startWeekday; i++) days.push(null);
  const last = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= last; d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);
  return days;
};

const isSameDay = (a, b) => a && b && a.toDateString() === b.toDateString();
const fmtTime = (d) =>
  new Date(d).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

export default function Calendar() {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [appts, setAppts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selected, setSelected] = useState(today);
  const [form, setForm] = useState({ title: "", location: "", starts_at: "", notes: "" });

  const selectedForInput = (d) => {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`;
  };
  useEffect(() => {
    setForm((f) => ({ ...f, starts_at: selectedForInput(selected) }));
  }, [selected]);

  const load = async () => {
    try {
      const [a, t] = await Promise.all([api.get("/appointments"), api.get("/tasks")]);
      setAppts(a.data || []);
      setTasks(t.data || []);
    } catch (err) {
      console.error("Failed to load appointments and tasks:", err);
      toast.error("Unable to load calendar events");
    }
  };
  useEffect(() => {
    load();
    const onR = () => load();
    window.addEventListener("lifeos:refresh", onR);
    return () => window.removeEventListener("lifeos:refresh", onR);
  }, []);

  const grid = useMemo(() => monthMatrix(cursor.getFullYear(), cursor.getMonth()), [cursor]);

  const eventsFor = (day) => {
    if (!day) return { appts: [], tasks: [] };
    const a = appts.filter((x) => isSameDay(new Date(x.starts_at), day));
    const t = tasks.filter((x) => x.due_date && isSameDay(new Date(x.due_date), day));
    return { appts: a, tasks: t };
  };

  const dayEvents = eventsFor(selected);

  const addAppt = async (e) => {
    e.preventDefault();
    if (!form.title || !form.starts_at) return;
    try {
      await api.post("/appointments", form);
      setForm({ title: "", location: "", starts_at: selectedForInput(selected), notes: "" });
      toast.success("Appointment added");
      load();
    } catch (err) {
      console.error("Failed to add appointment:", err);
      toast.error(err.response?.data?.error || "Could not add appointment");
    }
  };

  const removeAppt = async (id) => {
    try {
      await api.delete(`/appointments/${id}`);
      toast.success("Appointment removed");
      load();
    } catch (err) {
      console.error("Failed to delete appointment:", err);
      toast.error("Could not remove appointment");
    }
  };

  return (
    <div className="p-5 md:p-8 max-w-[1200px] mx-auto" data-testid="calendar-page">
      <div className="mb-6">
        <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500">
          Calendar
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold mt-2">
          {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </h1>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-5">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
                }
                className="btn btn-ghost !p-2"
                data-testid="cal-prev"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() =>
                  setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
                }
                className="btn btn-ghost !p-2"
                data-testid="cal-next"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => {
                  setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
                  setSelected(today);
                }}
                className="btn btn-ghost !py-1.5 !px-3 text-[12px]"
              >
                Today
              </button>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">MON – SUN</div>
          </div>

          <div className="grid grid-cols-7 text-[10px] text-slate-500 font-mono mb-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="py-1.5">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5" data-testid="calendar-grid">
            {grid.map((day, i) => {
              if (!day) return <div key={i} />;
              const isToday = isSameDay(day, today);
              const isSel = isSameDay(day, selected);
              const ev = eventsFor(day);
              const total = ev.appts.length + ev.tasks.length;
              return (
                <button
                  key={i}
                  onClick={() => setSelected(day)}
                  data-testid={`cal-day-${day.getDate()}`}
                  className={`aspect-square rounded-lg text-left p-2 flex flex-col border transition-colors ${
                    isSel
                      ? "border-indigo-500 bg-indigo-500/10"
                      : "border-transparent hover:border-slate-700"
                  } ${isToday ? "font-bold text-indigo-400" : "text-slate-200"}`}
                >
                  <span className="text-xs">{day.getDate()}</span>
                  {total > 0 && (
                    <div className="mt-auto flex gap-1">
                      {ev.appts.length > 0 && (
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      )}
                      {ev.tasks.length > 0 && (
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-5">
          <form onSubmit={addAppt} className="card p-5 space-y-3" data-testid="add-appt-form">
            <div className="font-display font-bold text-sm">Add Appointment</div>
            <input
              className="input"
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <input
              type="datetime-local"
              className="input"
              value={form.starts_at}
              onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
            />
            <input
              className="input"
              placeholder="Location (optional)"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
            <button type="submit" className="btn btn-primary w-full justify-center">
              <Plus size={14} /> Schedule
            </button>
          </form>

          <div className="card p-5" data-testid="selected-day-events">
            <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500 mb-3">
              {selected.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </div>
            {dayEvents.appts.length === 0 && dayEvents.tasks.length === 0 && (
              <div className="text-sm text-slate-500 py-4 text-center">Nothing scheduled.</div>
            )}
            <div className="space-y-2">
              {dayEvents.appts.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-slate-900/40 text-xs"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div>
                    <div className="font-medium text-slate-200">{a.title}</div>
                    <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                      <Clock size={11} /> {fmtTime(a.starts_at)} {a.location && `· ${a.location}`}
                    </div>
                  </div>
                  <button
                    onClick={() => removeAppt(a.id)}
                    className="text-slate-500 hover:text-red-400 p-1"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              {dayEvents.tasks.map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-lg border bg-slate-900/20 text-xs text-slate-400"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span className="text-emerald-400 mr-2">✓ Task:</span> {t.title}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
