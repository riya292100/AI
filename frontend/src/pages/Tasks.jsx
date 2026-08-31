import { useEffect, useMemo, useState } from "react";
import { Check, Plus, Trash2, Filter } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";

const priorityChip = (p) =>
  p === "high" ? "chip-danger" : p === "medium" ? "chip-warn" : "";
const statusOptions = [
  { key: "all", label: "All" },
  { key: "todo", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
];

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";

export default function Tasks() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [category, setCategory] = useState("general");
  const [due, setDue] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/tasks");
      setItems(data || []);
    } catch (err) {
      console.error("Failed to load tasks:", err);
      toast.error("Unable to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const onR = () => load();
    window.addEventListener("lifeos:refresh", onR);
    return () => window.removeEventListener("lifeos:refresh", onR);
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.status === filter)),
    [items, filter]
  );

  const add = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await api.post("/tasks", { title, priority, category, due_date: due || null });
      setTitle("");
      setDue("");
      setPriority("medium");
      setCategory("general");
      toast.success("Task added");
      load();
    } catch (err) {
      console.error("Failed to add task:", err);
      toast.error(err.response?.data?.error || "Could not add task");
    }
  };

  const toggle = async (t) => {
    const status = t.status === "done" ? "todo" : "done";
    setItems((old) => old.map((it) => (it.id === t.id ? { ...it, status } : it)));
    try {
      await api.patch(`/tasks/${t.id}`, { status });
    } catch (err) {
      console.error("Failed to toggle task:", err);
      toast.error("Could not update task");
      load();
    }
  };

  const remove = async (id) => {
    setItems((old) => old.filter((i) => i.id !== id));
    try {
      await api.delete(`/tasks/${id}`);
      toast.success("Deleted");
    } catch (err) {
      console.error("Failed to delete task:", err);
      toast.error("Could not delete task");
      load();
    }
  };

  return (
    <div className="p-5 md:p-8 max-w-[1100px] mx-auto" data-testid="tasks-page">
      <div className="mb-6">
        <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500">Tasks</div>
        <h1 className="font-display text-3xl md:text-4xl font-bold mt-2">
          Everything on your plate.
        </h1>
        <p className="text-slate-400 mt-2">Small check-ins beat heroic sprints. Add one, finish one.</p>
      </div>

      <form
        onSubmit={add}
        className="card p-4 mb-5 grid md:grid-cols-[1fr_auto_auto_auto_auto] gap-3"
        data-testid="add-task-form"
      >
        <input
          className="input"
          placeholder="Add a task…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          data-testid="new-task-title"
        />
        <select
          className="select md:w-[140px]"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          data-testid="new-task-priority"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <input
          className="input md:w-[150px]"
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          data-testid="new-task-category"
        />
        <input
          type="date"
          className="input md:w-[170px]"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          data-testid="new-task-due"
        />
        <button type="submit" className="btn btn-primary" data-testid="add-task-submit">
          <Plus size={15} /> Add
        </button>
      </form>

      <div className="flex items-center gap-2 mb-4 text-sm">
        <Filter size={13} className="text-slate-500" />
        {statusOptions.map((o) => (
          <button
            key={o.key}
            onClick={() => setFilter(o.key)}
            data-testid={`task-filter-${o.key}`}
            className={`px-3 py-1.5 rounded-lg border text-[12px] ${
              filter === o.key
                ? "border-indigo-500 text-indigo-200 bg-indigo-500/10"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            {o.label} {filter === o.key && `· ${filtered.length}`}
          </button>
        ))}
      </div>

      <div
        className="card divide-y"
        style={{ borderColor: "var(--border)" }}
        data-testid="task-list"
      >
        {loading &&
          [...Array(5)].map((_, i) => <div key={i} className="skeleton h-14 m-3" />)}
        {!loading && filtered.length === 0 && (
          <div className="p-10 text-center text-slate-500 text-sm">
            No tasks in this view. Add one above.
          </div>
        )}
        {filtered.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 px-4 py-3.5 group"
            data-testid={`task-item-${t.id}`}
          >
            <button
              onClick={() => toggle(t)}
              className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                t.status === "done"
                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                  : "border-slate-600 text-transparent hover:border-slate-400"
              }`}
              data-testid={`toggle-task-${t.id}`}
            >
              <Check size={13} />
            </button>
            <div className="flex-1 min-w-0">
              <div
                className={`text-[14px] ${
                  t.status === "done" ? "line-through text-slate-500" : "text-slate-100"
                }`}
              >
                {t.title}
              </div>
              <div className="text-[11px] text-slate-500 flex gap-3 mt-0.5">
                <span className="font-mono uppercase tracking-wider">{t.category}</span>
                {t.due_date && <span>{fmt(t.due_date)}</span>}
              </div>
            </div>
            <span className={`chip ${priorityChip(t.priority)}`}>{t.priority}</span>
            <button
              onClick={() => remove(t.id)}
              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-300 p-1.5"
              data-testid={`delete-task-${t.id}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
