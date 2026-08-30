import { useEffect, useState } from "react";
import { Search, X, ListChecks, Wallet, Receipt, FileText, CalendarDays, Target, ShoppingCart } from "lucide-react";
import api from "../lib/api";

const iconMap = {
  task: ListChecks,
  bill: Wallet,
  expense: Receipt,
  document: FileText,
  appointment: CalendarDays,
  habit: Target,
  shopping: ShoppingCart,
};

export default function GlobalSearch({ open, onClose }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) { setQ(""); setResults([]); return; }
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!q || q.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/search`, { params: { q } });
        setResults(data.results || []);
      } finally { setLoading(false); }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 md:pt-28" data-testid="global-search-dialog">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-xl mx-4 card rise">
        <div className="flex items-center gap-3 px-4 border-b" style={{ borderColor: "var(--border)" }}>
          <Search size={16} className="text-slate-400" />
          <input
            autoFocus
            className="flex-1 py-4 bg-transparent outline-none text-[14px] placeholder:text-slate-500"
            placeholder="Search tasks, bills, expenses, docs…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            data-testid="global-search-input"
          />
          <button className="btn btn-ghost !p-2" onClick={onClose}><X size={15} /></button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {loading && <div className="p-6 text-center text-slate-500 text-sm">Searching…</div>}
          {!loading && q.length >= 2 && results.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-sm">No matches</div>
          )}
          {!loading && results.map((r) => {
            const Icon = iconMap[r.kind] || Search;
            const title = r.title || r.name || r.notes || "(untitled)";
            return (
              <div
                key={`${r.kind}-${r.id}`}
                className="flex items-center gap-3 px-4 py-3 border-b hover:bg-white/[0.03] cursor-pointer"
                style={{ borderColor: "var(--border)" }}
                data-testid={`search-result-${r.id}`}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300" style={{ background: "#1b2432" }}>
                  <Icon size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{title}</div>
                  <div className="text-[11px] text-slate-500 uppercase tracking-wider font-mono">{r.kind}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
