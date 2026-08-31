import { useState } from "react";
import { X, ListChecks, Wallet, Receipt, CalendarDays, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiErrorDetail } from "../lib/api";

const kinds = [
  { key: "task", label: "Task", icon: ListChecks },
  { key: "bill", label: "Bill", icon: Wallet },
  { key: "expense", label: "Expense", icon: Receipt },
  { key: "appointment", label: "Appointment", icon: CalendarDays },
  { key: "shopping", label: "Shopping", icon: ShoppingCart },
];

export default function QuickAdd({ open, onClose }) {
  const [kind, setKind] = useState("task");
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const endpoints = {
        task: ["/tasks", { title: form.title, priority: form.priority || "medium", due_date: form.due_date || null, category: form.category || "general" }],
        bill: ["/bills", { name: form.title, amount: parseFloat(form.amount || 0), due_date: form.due_date || new Date().toISOString().slice(0,10), frequency: form.frequency || "monthly", category: form.category || "utilities" }],
        expense: ["/expenses", { amount: parseFloat(form.amount || 0), category: form.category || "misc", date: form.due_date || null, notes: form.title || "" }],
        appointment: ["/appointments", { title: form.title, location: form.category || "", starts_at: form.due_date || new Date().toISOString(), notes: form.notes || "" }],
        shopping: ["/shopping", { name: form.title, quantity: parseInt(form.amount || 1, 10) }],
      };
      const [url, body] = endpoints[kind];
      if (!body.title && !body.name && !body.amount) {
        toast.error("Please fill in the details");
        setSaving(false);
        return;
      }
      await api.post(url, body);
      toast.success(`${kinds.find(k => k.key === kind).label} added`);
      setForm({});
      onClose(true);
      // best-effort refresh by dispatching event
      window.dispatchEvent(new CustomEvent("lifeos:refresh"));
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" data-testid="quick-add-dialog">
      <div className="absolute inset-0 bg-black/60" onClick={() => onClose(false)} />
      <div className="relative w-full max-w-lg card rise" style={{ borderRadius: "18px" }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500">Quick add</div>
            <div className="font-display font-bold text-lg mt-1">Capture something new</div>
          </div>
          <button className="btn btn-ghost !p-2" onClick={() => onClose(false)} data-testid="quick-add-close">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 pb-5">
          <div className="grid grid-cols-5 gap-2 mb-4">
            {kinds.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                data-testid={`quick-add-kind-${key}`}
                onClick={() => setKind(key)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border text-[11px] font-medium transition-colors ${
                  kind === key ? "border-indigo-500 bg-indigo-500/10 text-indigo-200" : "text-slate-400 hover:text-white"
                }`}
                style={{ borderColor: kind === key ? "rgba(99,102,241,0.55)" : "var(--border)" }}
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="label">{kind === "expense" ? "Description" : "Title"}</label>
              <input
                className="input"
                placeholder={kind === "shopping" ? "Milk, bread…" : "What is it?"}
                value={form.title || ""}
                onChange={(e) => set("title", e.target.value)}
                data-testid="quick-add-title"
                autoFocus
              />
            </div>

            {(kind === "bill" || kind === "expense" || kind === "shopping") && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{kind === "shopping" ? "Quantity" : "Amount"}</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder={kind === "shopping" ? "1" : "0.00"}
                    value={form.amount || ""}
                    onChange={(e) => set("amount", e.target.value)}
                    data-testid="quick-add-amount"
                  />
                </div>
                <div>
                  <label className="label">Category</label>
                  <input className="input" placeholder="misc" value={form.category || ""} onChange={(e) => set("category", e.target.value)} />
                </div>
              </div>
            )}

            {(kind === "task" || kind === "bill" || kind === "expense" || kind === "appointment") && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{kind === "appointment" ? "When" : "Due date"}</label>
                  <input
                    type={kind === "appointment" ? "datetime-local" : "date"}
                    className="input"
                    value={form.due_date || ""}
                    onChange={(e) => set("due_date", e.target.value)}
                    data-testid="quick-add-date"
                  />
                </div>
                {kind === "task" && (
                  <div>
                    <label className="label">Priority</label>
                    <select className="select" value={form.priority || "medium"} onChange={(e) => set("priority", e.target.value)}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                )}
                {kind === "appointment" && (
                  <div>
                    <label className="label">Location</label>
                    <input className="input" value={form.category || ""} onChange={(e) => set("category", e.target.value)} />
                  </div>
                )}
              </div>
            )}

            <button type="submit" className="btn btn-primary w-full justify-center" disabled={saving} data-testid="quick-add-submit">
              {saving ? "Saving…" : `Add ${kinds.find(k => k.key === kind).label.toLowerCase()}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
