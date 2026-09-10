import { useState } from "react";
import { Check, Plus, Trash2, Filter } from "lucide-react";
import { formatDate as fmt } from "../lib/formatters";
import { useTasksData } from "../hooks/useTasksData";

const priorityChip = (p) =>
  p === "high" ? "chip-danger" : p === "medium" ? "chip-warn" : "";
const statusOptions = [
  { key: "all", label: "All" },
  { key: "todo", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
];

export default function Tasks() {
  const { filteredItems: filtered, filter, setFilter, loading, addTask, toggleTask: toggle, deleteTask: remove } =
    useTasksData();

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [category, setCategory] = useState("general");
  const [due, setDue] = useState("");

  const add = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const res = await addTask({ title, priority, category, due_date: due || null });
    if (res.ok) {
      setTitle("");
      setDue("");
      setPriority("medium");
      setCategory("general");
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
