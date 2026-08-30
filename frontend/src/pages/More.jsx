import { useEffect, useMemo, useState } from "react";
import { FileText, Target, ShoppingCart, Plus, Trash2, Check, LogOut } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const daysBetween = (d) => Math.round((new Date(d) - new Date()) / (1000 * 60 * 60 * 24));

function DocumentsPanel() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: "", type: "id", expiry_date: "" });
  const load = async () => setItems((await api.get("/documents")).data);
  useEffect(() => { load(); }, []);
  const add = async (e) => {
    e.preventDefault();
    if (!form.name) return;
    await api.post("/documents", { ...form, expiry_date: form.expiry_date || null });
    toast.success("Document saved");
    setForm({ name: "", type: "id", expiry_date: "" });
    load();
  };
  return (
    <div>
      <form onSubmit={add} className="grid md:grid-cols-[1fr_auto_auto_auto] gap-3 mb-4" data-testid="add-doc-form">
        <input className="input" placeholder="Passport, insurance card…" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <select className="select md:w-[150px]" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="id">ID</option>
          <option value="insurance">Insurance</option>
          <option value="warranty">Warranty</option>
          <option value="contract">Contract</option>
          <option value="receipt">Receipt</option>
        </select>
        <input type="date" className="input md:w-[170px]" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
        <button type="submit" className="btn btn-primary"><Plus size={14} /> Save</button>
      </form>
      <div className="text-[11px] text-slate-500 mb-2 font-mono">
        Tip: leave expiry empty for auto-detect (mock OCR fills a plausible date for IDs/insurance/warranties).
      </div>
      <div className="card divide-y" style={{ borderColor: "var(--border)" }} data-testid="documents-list">
        {items.length === 0 && <div className="p-8 text-center text-slate-500 text-sm">No documents stored.</div>}
        {items.map((d) => {
          const dU = d.expiry_date ? daysBetween(d.expiry_date) : null;
          const tone = dU == null ? "" : dU < 15 ? "chip-danger" : dU < 60 ? "chip-warn" : "chip-accent";
          return (
            <div key={d.id} className="flex items-center gap-3 px-4 py-3 group">
              <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-300 flex items-center justify-center"><FileText size={14} /></div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium">{d.name}</div>
                <div className="text-[11px] text-slate-500 uppercase font-mono tracking-wider">{d.type}</div>
              </div>
              {d.expiry_date && <span className={`chip ${tone}`}>expires in {dU}d</span>}
              <button onClick={async () => { await api.delete(`/documents/${d.id}`); load(); }} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-300 p-1.5">
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
  const load = async () => setItems((await api.get("/habits")).data);
  useEffect(() => { load(); }, []);
  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.post("/habits", { name });
    setName(""); load();
  };
  const today = new Date().toISOString().slice(0, 10);
  const toggleToday = async (h) => { await api.post(`/habits/${h.id}/log`, { date: today }); load(); };
  const last7 = useMemo(() => {
    const arr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      arr.push(d.toISOString().slice(0, 10));
    }
    return arr;
  }, []);

  return (
    <div>
      <form onSubmit={add} className="flex gap-3 mb-4" data-testid="add-habit-form">
        <input className="input" placeholder="Morning walk, read 20 min…" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-primary"><Plus size={14} /> Add</button>
      </form>
      <div className="grid md:grid-cols-2 gap-3" data-testid="habits-list">
        {items.length === 0 && <div className="col-span-2 p-8 text-center text-slate-500 text-sm card">No habits yet.</div>}
        {items.map((h) => {
          const logs = new Set(h.logs || []);
          const doneToday = logs.has(today);
          return (
            <div key={h.id} className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-display font-bold text-[15px]">{h.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{h.logs?.length || 0} check-ins total</div>
                </div>
                <button
                  onClick={() => toggleToday(h)}
                  className={`btn ${doneToday ? "btn-primary" : ""} !py-1.5 !px-3 text-[12px]`}
                  data-testid={`habit-toggle-${h.id}`}
                >
                  <Check size={13} /> {doneToday ? "Done" : "Log"}
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1.5 mt-4">
                {last7.map((d) => (
                  <div key={d} className={`h-6 rounded ${logs.has(d) ? "bg-emerald-500/50" : "bg-white/[0.04]"}`} title={d} />
                ))}
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
  const load = async () => setItems((await api.get("/shopping")).data);
  useEffect(() => { load(); }, []);
  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.post("/shopping", { name });
    setName(""); load();
  };
  return (
    <div>
      <form onSubmit={add} className="flex gap-3 mb-4" data-testid="add-shopping-form">
        <input className="input" placeholder="Milk, bread…" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-primary"><Plus size={14} /> Add</button>
      </form>
      <div className="card divide-y" style={{ borderColor: "var(--border)" }} data-testid="shopping-list">
        {items.length === 0 && <div className="p-8 text-center text-slate-500 text-sm">List is empty.</div>}
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-3 px-4 py-3 group">
            <button
              onClick={async () => { await api.patch(`/shopping/${it.id}`); load(); }}
              className={`w-5 h-5 rounded border flex items-center justify-center ${it.checked ? "bg-emerald-500/20 border-emerald-400 text-emerald-300" : "border-slate-600 text-transparent"}`}
              data-testid={`shopping-toggle-${it.id}`}
            >
              <Check size={13} />
            </button>
            <div className={`flex-1 text-[14px] ${it.checked ? "line-through text-slate-500" : "text-slate-100"}`}>{it.name} <span className="text-slate-500 text-[12px]">×{it.quantity}</span></div>
            <button onClick={async () => { await api.delete(`/shopping/${it.id}`); load(); }} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-300 p-1.5">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const tabs = [
  { k: "docs", label: "Documents", icon: FileText },
  { k: "habits", label: "Habits", icon: Target },
  { k: "shopping", label: "Shopping", icon: ShoppingCart },
];

export default function More() {
  const [tab, setTab] = useState("docs");
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="p-5 md:p-8 max-w-[1000px] mx-auto" data-testid="more-page">
      <div className="mb-6">
        <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500">More</div>
        <h1 className="font-display text-3xl md:text-4xl font-bold mt-2">Everything else, in one place.</h1>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {tabs.map(({ k, label, icon: Icon }) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            data-testid={`more-tab-${k}`}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap border ${tab === k ? "border-indigo-500 bg-indigo-500/10 text-indigo-200" : "border-transparent text-slate-400 hover:text-white"}`}
          >
            <Icon size={13} className="inline mr-2" /> {label}
          </button>
        ))}
      </div>

      {tab === "docs" && <DocumentsPanel />}
      {tab === "habits" && <HabitsPanel />}
      {tab === "shopping" && <ShoppingPanel />}

      <div className="card mt-8 p-5" data-testid="account-panel">
        <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500 mb-2">Account</div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[14px] font-medium">{user?.name}</div>
            <div className="text-[12px] text-slate-500">{user?.email}</div>
          </div>
          <button className="btn" onClick={async () => { await logout(); navigate("/login"); }}>
            <LogOut size={14} /> Log out
          </button>
        </div>
      </div>
    </div>
  );
}
