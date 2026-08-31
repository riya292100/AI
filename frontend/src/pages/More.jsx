import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Target,
  ShoppingCart,
  Plus,
  Trash2,
  Check,
  LogOut,
  PieChart,
  Bell,
} from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const daysBetween = (d) => Math.round((new Date(d) - new Date()) / (1000 * 60 * 60 * 24));

function DocumentsPanel() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: "", type: "id", expiry_date: "" });

  const load = async () => {
    try {
      const res = await api.get("/documents");
      setItems(res.data || []);
    } catch (err) {
      console.error("Failed to load documents:", err);
      toast.error("Could not load documents");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!form.name) return;
    try {
      await api.post("/documents", { ...form, expiry_date: form.expiry_date || null });
      toast.success("Document saved");
      setForm({ name: "", type: "id", expiry_date: "" });
      load();
    } catch (err) {
      console.error("Failed to save document:", err);
      toast.error(err.response?.data?.error || "Could not save document");
    }
  };

  const removeDoc = async (id) => {
    try {
      await api.delete(`/documents/${id}`);
      toast.success("Document removed");
      load();
    } catch (err) {
      console.error("Failed to remove document:", err);
      toast.error("Could not delete document");
    }
  };

  return (
    <div>
      <form
        onSubmit={add}
        className="grid md:grid-cols-[1fr_auto_auto_auto] gap-3 mb-4"
        data-testid="add-doc-form"
      >
        <input
          className="input"
          placeholder="Passport, insurance card…"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <select
          className="select md:w-[150px]"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          <option value="id">ID</option>
          <option value="insurance">Insurance</option>
          <option value="warranty">Warranty</option>
          <option value="contract">Contract</option>
          <option value="receipt">Receipt</option>
        </select>
        <input
          type="date"
          className="input md:w-[170px]"
          value={form.expiry_date}
          onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
        />
        <button type="submit" className="btn btn-primary">
          <Plus size={14} /> Save
        </button>
      </form>
      <div className="text-[11px] text-slate-500 mb-2 font-mono">
        Tip: leave expiry empty for auto-detect (mock OCR fills a plausible date for
        IDs/insurance/warranties).
      </div>
      <div
        className="card divide-y"
        style={{ borderColor: "var(--border)" }}
        data-testid="documents-list"
      >
        {items.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-sm">No documents stored.</div>
        )}
        {items.map((d) => {
          const dU = d.expiry_date ? daysBetween(d.expiry_date) : null;
          const tone =
            dU == null ? "" : dU < 15 ? "chip-danger" : dU < 60 ? "chip-warn" : "chip-accent";
          return (
            <div key={d.id} className="flex items-center gap-3 px-4 py-3 group">
              <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-300 flex items-center justify-center">
                <FileText size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium">{d.name}</div>
                <div className="text-[11px] text-slate-500 uppercase font-mono tracking-wider">
                  {d.type}
                </div>
              </div>
              {d.expiry_date && <span className={`chip ${tone}`}>expires in {dU}d</span>}
              <button
                onClick={() => removeDoc(d.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-300 p-1.5"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HabitsPanel() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");

  const load = async () => {
    try {
      const res = await api.get("/habits");
      setItems(res.data || []);
    } catch (err) {
      console.error("Failed to load habits:", err);
      toast.error("Could not load habits");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.post("/habits", { name });
      setName("");
      toast.success("Habit added");
      load();
    } catch (err) {
      console.error("Failed to add habit:", err);
      toast.error(err.response?.data?.error || "Could not add habit");
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const toggleToday = async (h) => {
    try {
      await api.post(`/habits/${h.id}/log`, { date: today });
      load();
    } catch (err) {
      console.error("Failed to log habit:", err);
      toast.error("Could not log habit");
    }
  };

  const removeHabit = async (id) => {
    try {
      await api.delete(`/habits/${id}`);
      toast.success("Habit removed");
      load();
    } catch (err) {
      console.error("Failed to delete habit:", err);
      toast.error("Could not delete habit");
    }
  };

  return (
    <div>
      <form onSubmit={add} className="flex gap-3 mb-4" data-testid="add-habit-form">
        <input
          className="input"
          placeholder="Morning walk, read 20 min…"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn btn-primary">
          <Plus size={14} /> Add
        </button>
      </form>
      <div className="grid md:grid-cols-2 gap-3" data-testid="habits-list">
        {items.length === 0 && (
          <div className="col-span-2 p-8 text-center text-slate-500 text-sm card">
            No habits yet.
          </div>
        )}
        {items.map((h) => {
          const logs = new Set(h.logs || []);
          const doneToday = logs.has(today);
          return (
            <div key={h.id} className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-100">{h.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Target: {h.target_days_per_week || 7} days/wk
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleToday(h)}
                    className={`btn !py-1.5 !px-3 text-xs ${
                      doneToday ? "btn-primary" : "btn-ghost border border-slate-700"
                    }`}
                  >
                    {doneToday ? "✓ Done today" : "Log today"}
                  </button>
                  <button
                    onClick={() => removeHabit(h.id)}
                    className="text-slate-500 hover:text-red-400 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ShoppingPanel() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");

  const load = async () => {
    try {
      const res = await api.get("/shopping");
      setItems(res.data || []);
    } catch (err) {
      console.error("Failed to load shopping list:", err);
      toast.error("Could not load shopping list");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.post("/shopping", { name, quantity: 1 });
      setName("");
      toast.success("Item added");
      load();
    } catch (err) {
      console.error("Failed to add shopping item:", err);
      toast.error(err.response?.data?.error || "Could not add item");
    }
  };

  const toggle = async (id) => {
    try {
      await api.patch(`/shopping/${id}`);
      load();
    } catch (err) {
      console.error("Failed to toggle shopping item:", err);
      toast.error("Could not update item");
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/shopping/${id}`);
      load();
    } catch (err) {
      console.error("Failed to delete shopping item:", err);
      toast.error("Could not delete item");
    }
  };

  return (
    <div>
      <form onSubmit={add} className="flex gap-3 mb-4" data-testid="add-shopping-form">
        <input
          className="input flex-1"
          placeholder="Oat milk, coffee beans…"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn btn-primary">
          <Plus size={14} /> Add
        </button>
      </form>
      <div
        className="card divide-y"
        style={{ borderColor: "var(--border)" }}
        data-testid="shopping-list"
      >
        {items.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-sm">Shopping list is clear.</div>
        )}
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between p-3.5 group">
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggle(it.id)}
                className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                  it.checked
                    ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                    : "border-slate-600 hover:border-slate-400"
                }`}
              >
                {it.checked && <Check size={12} />}
              </button>
              <span
                className={`text-sm ${
                  it.checked ? "line-through text-slate-500" : "text-slate-200"
                }`}
              >
                {it.name}
              </span>
            </div>
            <button
              onClick={() => remove(it.id)}
              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function More() {
  const [tab, setTab] = useState("documents");
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="p-5 md:p-8 max-w-[1100px] mx-auto" data-testid="more-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500">
            More Tools
          </div>
          <h1 className="font-display text-3xl font-bold mt-1">Locker & Habits</h1>
        </div>
        <button
          onClick={handleLogout}
          className="btn btn-ghost text-red-400 hover:text-red-300 flex items-center gap-2 text-xs"
        >
          <LogOut size={14} /> Sign out ({user?.name || user?.email})
        </button>
      </div>

      <div className="flex gap-2 mb-6 border-b border-slate-800 pb-2">
        <button
          onClick={() => setTab("documents")}
          className={`px-3 py-1.5 rounded-lg text-sm ${
            tab === "documents" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
          }`}
        >
          <FileText size={14} className="inline mr-1.5" /> Documents
        </button>
        <button
          onClick={() => setTab("habits")}
          className={`px-3 py-1.5 rounded-lg text-sm ${
            tab === "habits" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
          }`}
        >
          <Target size={14} className="inline mr-1.5" /> Habits
        </button>
        <button
          onClick={() => setTab("shopping")}
          className={`px-3 py-1.5 rounded-lg text-sm ${
            tab === "shopping" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
          }`}
        >
          <ShoppingCart size={14} className="inline mr-1.5" /> Shopping
        </button>
      </div>

      {tab === "documents" && <DocumentsPanel />}
      {tab === "habits" && <HabitsPanel />}
      {tab === "shopping" && <ShoppingPanel />}
    </div>
  );
}
