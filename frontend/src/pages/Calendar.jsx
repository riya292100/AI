import { useEffect, useState } from "react";
import { Plus, Trash2, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { formatTime as fmtTime, isSameDay, toDatetimeLocal as selectedForInput } from "../lib/formatters";
import { useCalendarData } from "../hooks/useCalendarData";

export default function Calendar() {
  const today = new Date();
  const {
    cursor,
    setCursor,
    selected,
    setSelected,
    grid,
    eventsFor,
    selectedEvents: dayEvents,
    prevMonth,
    nextMonth,
    goToToday,
    addAppointment,
    deleteAppointment: removeAppt,
  } = useCalendarData();

  const [form, setForm] = useState({ title: "", location: "", starts_at: "", notes: "" });

  useEffect(() => {
    setForm((f) => ({ ...f, starts_at: selectedForInput(selected) }));
  }, [selected]);

  const addAppt = async (e) => {
    e.preventDefault();
    if (!form.title || !form.starts_at) return;
    const ok = await addAppointment(form);
    if (ok) {
      setForm({ title: "", location: "", starts_at: selectedForInput(selected), notes: "" });
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
                onClick={prevMonth}
                className="btn btn-ghost !p-2"
                data-testid="cal-prev"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={nextMonth}
                className="btn btn-ghost !p-2"
                data-testid="cal-next"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={goToToday}
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
              data-testid="appt-title-input"
            />
            <input
              type="datetime-local"
              className="input"
              value={form.starts_at}
              onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
              data-testid="appt-time-input"
            />
            <input
              className="input"
              placeholder="Location (optional)"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              data-testid="appt-location-input"
            />
            <button type="submit" className="btn btn-primary w-full justify-center" data-testid="appt-submit">
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
                    data-testid={`delete-appt-${a.id}`}
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
