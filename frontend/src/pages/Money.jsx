import { useEffect, useMemo, useState } from "react";
import { Wallet, Plus, Trash2, Check, Receipt } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";

const currency = (n, c = "USD") => new Intl.NumberFormat(undefined, { style: "currency", currency: c }).format(n || 0);
const fmt = (d) => d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";

const StatusBadge = ({ status, daysUntil }) => {
  if (status === "paid") return <span className="chip chip-accent"><Check size={11} /> paid</span>;
  if (typeof daysUntil === "number" && daysUntil < 0) return <span className="chip chip-danger">overdue</span>;
  if (typeof daysUntil === "number" && daysUntil <= 3) return <span className="chip chip-danger">soon</span>;
  if (typeof daysUntil === "number" && daysUntil <= 7) return <span className="chip chip-warn">this week</span>;
  return <span className="chip">upcoming</span>;
};

const daysBetween = (d) => Math.round((new Date(d) - new Date()) / (1000 * 60 * 60 * 24));

export default function Money() {
  const [tab, setTab] = useState("bills");
  const [bills, setBills] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [billForm, setBillForm] = useState({ name: "", amount: "", due_date: "", category: "utilities", frequency: "monthly" });
  const [expForm, setExpForm] = useState({ amount: "", category: "food", notes: "" });

  const load = async () => {
    const [b, e] = await Promise.all([api.get("/bills"), api.get("/expenses")]);
    setBills(b.data);
    setExpenses(e.data);
  };
  useEffect(() => {
    load();
    const onR = () => load();
    window.addEventListener("lifeos:refresh", onR);
    return () => window.removeEventListener("lifeos:refresh", onR);
  }, []);

  const monthTotal = useMemo(() => {
    const start = new Date();
    start.setDate(1); start.setHours(0,0,0,0);
    return expenses.filter((e) => new Date(e.date) >= start).reduce((s, e) => s + Number(e.amount || 0), 0);
  }, [expenses]);

  const upcomingTotal = useMemo(() =>
    bills.filter((b) => b.status !== "paid").reduce((s, b) => s + Number(b.amount || 0), 0),
  [bills]);

  const byCategory = useMemo(() => {
    const map = {};
    expenses.forEach((e) => {
      const start = new Date(); start.setDate(1); start.setHours(0,0,0,0);
      if (new Date(e.date) >= start) map[e.category] = (map[e.category] || 0) + Number(e.amount || 0);
    });
    return Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0,6);
  }, [expenses]);
  const catMax = Math.max(1, ...byCategory.map(([,v]) => v));

  const addBill = async (e) => {
    e.preventDefault();
    if (!billForm.name || !billForm.amount || !billForm.due_date) return;
    await api.post("/bills", { ...billForm, amount: parseFloat(billForm.amount) });
    setBillForm({ name: "", amount: "", due_date: "", category: "utilities", frequency: "monthly" });
    toast.success("Bill added");
    load();
  };
  const addExpense = async (e) => {
    e.preventDefault();
    if (!expForm.amount) return;
    await api.post("/expenses", { amount: parseFloat(expForm.amount), category: expForm.category, notes: expForm.notes });
    setExpForm({ amount: "", category: "food", notes: "" });
    toast.success("Expense logged");
    load();
  };

  const payBill = async (b) => {
    await api.patch(`/bills/${b.id}`, { status: "paid" });
    toast.success(`${b.name} marked paid`);
    load();
  };
  const removeBill = async (id) => { await api.delete(`/bills/${id}`); load(); };
  const removeExp = async (id) => { await api.delete(`/expenses/${id}`); load(); };

  return (
    <div className="p-5 md:p-8 max-w-[1200px] mx-auto" data-testid="money-page">
      <div className="mb-6">
        <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500">Money</div>
        <h1 className="font-display text-3xl md:text-4xl font-bold mt-2">Where your money goes.</h1>
        <p className="text-slate-400 mt-2">Bills you owe, expenses you logged, and the shape of the month so far.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="card p-5" data-testid="money-kpi-owed">
          <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500">Total owed</div>
          <div className="font-display text-3xl font-bold mt-2">{currency(upcomingTotal)}</div>
          <div className="text-[12px] text-slate-500 mt-1">{bills.filter(b => b.status !== "paid").length} bills unpaid</div>
        </div>
        <div className="card p-5" data-testid="money-kpi-spent">
          <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500">Spent this month</div>
          <div className="font-display text-3xl font-bold mt-2">{currency(monthTotal)}</div>
          <div className="text-[12px] text-slate-500 mt-1">{expenses.length} entries</div>
        </div>
        <div className="card p-5" data-testid="money-kpi-categories">
          <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500">Top categories</div>
          <div className="mt-3 space-y-2">
            {byCategory.length === 0 && <div className="text-sm text-slate-500">No expenses logged yet.</div>}
            {byCategory.map(([k, v]) => (
              <div key={k}>
                <div className="flex justify-between text-[12px] text-slate-300">
                  <span className="capitalize">{k}</span>
                  <span className="font-mono">{currency(v)}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden mt-1" style={{ background: "#1b2432" }}>
                  <div className="h-full" style={{ width: `${(v/catMax)*100}%`, background: "linear-gradient(90deg,#6366F1,#10B981)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("bills")} data-testid="tab-bills" className={`px-4 py-2 rounded-lg text-[13px] font-medium ${tab === "bills" ? "bg-indigo-500/15 text-indigo-200 border border-indigo-500/40" : "text-slate-400 hover:text-white"}`}>
          <Wallet size={13} className="inline mr-2" />Bills
        </button>
        <button onClick={() => setTab("expenses")} data-testid="tab-expenses" className={`px-4 py-2 rounded-lg text-[13px] font-medium ${tab === "expenses" ? "bg-indigo-500/15 text-indigo-200 border border-indigo-500/40" : "text-slate-400 hover:text-white"}`}>
          <Receipt size={13} className="inline mr-2" />Expenses
        </button>
      </div>

      {tab === "bills" ? (
        <>
          <form onSubmit={addBill} className="card p-4 mb-4 grid md:grid-cols-[1fr_auto_auto_auto_auto] gap-3" data-testid="add-bill-form">
            <input className="input" placeholder="Bill name (Electric, Rent…)" value={billForm.name} onChange={(e) => setBillForm({ ...billForm, name: e.target.value })} />
            <input type="number" step="0.01" className="input md:w-[130px]" placeholder="0.00" value={billForm.amount} onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })} />
            <input type="date" className="input md:w-[170px]" value={billForm.due_date} onChange={(e) => setBillForm({ ...billForm, due_date: e.target.value })} />
            <select className="select md:w-[140px]" value={billForm.frequency} onChange={(e) => setBillForm({ ...billForm, frequency: e.target.value })}>
              <option value="once">Once</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option>
            </select>
            <button type="submit" className="btn btn-primary" data-testid="add-bill-submit"><Plus size={15} /> Add</button>
          </form>

          <div className="card divide-y" style={{ borderColor: "var(--border)" }} data-testid="bills-list">
            {bills.length === 0 && <div className="p-10 text-center text-slate-500 text-sm">No bills yet.</div>}
            {bills.map((b) => {
              const dU = daysBetween(b.due_date);
              return (
                <div key={b.id} className="flex items-center gap-3 px-4 py-3.5 group" data-testid={`bill-item-${b.id}`}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-500/15 text-slate-300 capitalize font-mono text-[11px]">
                    {b.category.slice(0,2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium">{b.name}</div>
                    <div className="text-[11px] text-slate-500">{fmt(b.due_date)} · {b.frequency}</div>
                  </div>
                  <StatusBadge status={b.status} daysUntil={dU} />
                  <div className="font-display font-bold text-[15px] w-[90px] text-right">{currency(b.amount)}</div>
                  {b.status !== "paid" && (
                    <button onClick={() => payBill(b)} className="btn btn-ghost !py-1.5 !px-3 text-[12px]" data-testid={`pay-bill-${b.id}`}>Mark paid</button>
                  )}
                  <button onClick={() => removeBill(b.id)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-300 p-1.5" data-testid={`delete-bill-${b.id}`}>
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <form onSubmit={addExpense} className="card p-4 mb-4 grid md:grid-cols-[auto_auto_1fr_auto] gap-3" data-testid="add-expense-form">
            <input type="number" step="0.01" className="input md:w-[130px]" placeholder="0.00" value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} />
            <input className="input md:w-[150px]" placeholder="Category" value={expForm.category} onChange={(e) => setExpForm({ ...expForm, category: e.target.value })} />
            <input className="input" placeholder="Notes" value={expForm.notes} onChange={(e) => setExpForm({ ...expForm, notes: e.target.value })} />
            <button type="submit" className="btn btn-primary" data-testid="add-expense-submit"><Plus size={15} /> Log</button>
          </form>
          <div className="card divide-y" style={{ borderColor: "var(--border)" }} data-testid="expenses-list">
            {expenses.length === 0 && <div className="p-10 text-center text-slate-500 text-sm">No expenses logged yet.</div>}
            {expenses.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3.5 group" data-testid={`expense-item-${e.id}`}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/15 text-emerald-300">
                  <Receipt size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium truncate">{e.notes || "Expense"}</div>
                  <div className="text-[11px] text-slate-500 flex gap-2 mt-0.5">
                    <span className="capitalize">{e.category}</span> · <span>{fmt(e.date)}</span>
                  </div>
                </div>
                <div className="font-display font-bold text-[15px]">{currency(e.amount)}</div>
                <button onClick={() => removeExp(e.id)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-300 p-1.5">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
