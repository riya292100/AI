import { useState } from "react";
import { Plus, Trash2, Check } from "lucide-react";
import { currency, formatDate as fmt, daysBetween } from "../lib/formatters";
import { useMoneyData } from "../hooks/useMoneyData";

const StatusBadge = ({ status, daysUntil }) => {
  if (status === "paid")
    return (
      <span className="chip chip-accent">
        <Check size={11} /> paid
      </span>
    );
  if (typeof daysUntil === "number" && daysUntil < 0)
    return <span className="chip chip-danger">overdue</span>;
  if (typeof daysUntil === "number" && daysUntil <= 3)
    return <span className="chip chip-danger">soon</span>;
  if (typeof daysUntil === "number" && daysUntil <= 7)
    return <span className="chip chip-warn">this week</span>;
  return <span className="chip">upcoming</span>;
};

export default function Money() {
  const [tab, setTab] = useState("bills");
  const {
    bills,
    expenses,
    monthTotal,
    upcomingTotal,
    byCategory,
    addBill: createBill,
    addExpense: createExpense,
    toggleBillPaid: payBill,
    deleteBill: removeBill,
    deleteExpense: removeExp,
  } = useMoneyData();

  const [billForm, setBillForm] = useState({
    name: "",
    amount: "",
    due_date: "",
    category: "utilities",
    frequency: "monthly",
  });
  const [expForm, setExpForm] = useState({ amount: "", category: "food", notes: "" });

  const addBill = async (e) => {
    e.preventDefault();
    if (!billForm.name || !billForm.amount || !billForm.due_date) return;
    const ok = await createBill(billForm);
    if (ok) {
      setBillForm({
        name: "",
        amount: "",
        due_date: "",
        category: "utilities",
        frequency: "monthly",
      });
    }
  };

  const addExpense = async (e) => {
    e.preventDefault();
    if (!expForm.amount) return;
    const ok = await createExpense(expForm);
    if (ok) {
      setExpForm({ amount: "", category: "food", notes: "" });
    }
  };

  return (
    <div className="p-5 md:p-8 max-w-[1200px] mx-auto" data-testid="money-page">
      <div className="mb-6">
        <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500">Money</div>
        <h1 className="font-display text-3xl md:text-4xl font-bold mt-2">Where your money goes.</h1>
        <p className="text-slate-400 mt-2">
          Bills you owe, expenses you logged, and the shape of the month so far.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="card p-5" data-testid="money-kpi-owed">
          <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500">Total owed</div>
          <div className="font-display text-3xl font-bold mt-2">{currency(upcomingTotal)}</div>
          <div className="text-[12px] text-slate-500 mt-1">
            {bills.filter((b) => b.status !== "paid").length} bills unpaid
          </div>
        </div>
        <div className="card p-5" data-testid="money-kpi-spent">
          <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500">
            Spent this month
          </div>
          <div className="font-display text-3xl font-bold mt-2">{currency(monthTotal)}</div>
          <div className="text-[12px] text-slate-500 mt-1">{expenses.length} entries</div>
        </div>
        <div className="card p-5" data-testid="money-kpi-top">
          <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500">
            Top category
          </div>
          <div className="font-display text-3xl font-bold mt-2 capitalize">
            {byCategory[0]?.[0] || "—"}
          </div>
          <div className="text-[12px] text-slate-500 mt-1">
            {byCategory[0] ? currency(byCategory[0][1]) : "No data"}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("bills")}
          data-testid="tab-bills"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "bills" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          Bills ({bills.length})
        </button>
        <button
          onClick={() => setTab("expenses")}
          data-testid="tab-expenses"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "expenses"
              ? "bg-indigo-600 text-white"
              : "bg-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          Expenses ({expenses.length})
        </button>
      </div>

      {tab === "bills" ? (
        <div>
          <form
            onSubmit={addBill}
            className="card p-4 mb-5 grid md:grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3"
            data-testid="add-bill-form"
          >
            <input
              className="input"
              placeholder="Bill name (Rent, Netflix…)"
              value={billForm.name}
              onChange={(e) => setBillForm({ ...billForm, name: e.target.value })}
              data-testid="bill-name-input"
            />
            <input
              type="number"
              step="0.01"
              className="input md:w-[130px]"
              placeholder="Amount"
              value={billForm.amount}
              onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })}
              data-testid="bill-amount-input"
            />
            <input
              type="date"
              className="input md:w-[160px]"
              value={billForm.due_date}
              onChange={(e) => setBillForm({ ...billForm, due_date: e.target.value })}
              data-testid="bill-due-input"
            />
            <select
              className="select md:w-[130px]"
              value={billForm.frequency}
              onChange={(e) => setBillForm({ ...billForm, frequency: e.target.value })}
              data-testid="bill-freq-input"
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="weekly">Weekly</option>
              <option value="once">Once</option>
            </select>
            <input
              className="input md:w-[130px]"
              placeholder="Category"
              value={billForm.category}
              onChange={(e) => setBillForm({ ...billForm, category: e.target.value })}
              data-testid="bill-cat-input"
            />
            <button type="submit" className="btn btn-primary" data-testid="bill-submit">
              <Plus size={15} /> Add
            </button>
          </form>

          <div className="card divide-y" style={{ borderColor: "var(--border)" }} data-testid="bills-list">
            {bills.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm">No bills recorded.</div>
            )}
            {bills.map((b) => {
              const dU = daysBetween(b.due_date);
              return (
                <div key={b.id} className="flex items-center justify-between p-4 group">
                  <div className="flex items-center gap-3">
                    {b.status !== "paid" && (
                      <button
                        onClick={() => payBill(b)}
                        className="btn btn-ghost !p-2 text-slate-400 hover:text-emerald-400"
                        title="Mark paid"
                      >
                        <Check size={16} />
                      </button>
                    )}
                    <div>
                      <div className="font-medium text-slate-200">{b.name}</div>
                      <div className="text-xs text-slate-500">
                        Due {fmt(b.due_date)} · {b.frequency} · {b.category}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={b.status} daysUntil={dU} />
                    <div className="font-mono font-bold text-slate-100">{currency(b.amount)}</div>
                    <button
                      onClick={() => removeBill(b.id)}
                      data-testid={`delete-bill-${b.id}`}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div>
          <form
            onSubmit={addExpense}
            className="card p-4 mb-5 grid md:grid-cols-[auto_auto_1fr_auto] gap-3"
            data-testid="add-expense-form"
          >
            <input
              type="number"
              step="0.01"
              className="input md:w-[140px]"
              placeholder="Amount ($)"
              value={expForm.amount}
              onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })}
              data-testid="expense-amount-input"
            />
            <input
              className="input md:w-[150px]"
              placeholder="Category (food, etc)"
              value={expForm.category}
              onChange={(e) => setExpForm({ ...expForm, category: e.target.value })}
              data-testid="expense-cat-input"
            />
            <input
              className="input"
              placeholder="Notes (Trader Joe's, coffee…)"
              value={expForm.notes}
              onChange={(e) => setExpForm({ ...expForm, notes: e.target.value })}
              data-testid="expense-notes-input"
            />
            <button type="submit" className="btn btn-primary" data-testid="expense-submit">
              <Plus size={15} /> Log
            </button>
          </form>

          <div
            className="card divide-y"
            style={{ borderColor: "var(--border)" }}
            data-testid="expenses-list"
          >
            {expenses.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm">No expenses logged.</div>
            )}
            {expenses.map((e) => (
              <div key={e.id} className="flex items-center justify-between p-4 group">
                <div>
                  <div className="font-medium text-slate-200 capitalize">{e.category}</div>
                  <div className="text-xs text-slate-500">
                    {fmt(e.date)} {e.notes && `· ${e.notes}`}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="font-mono font-bold text-slate-100">{currency(e.amount)}</div>
                  <button
                    onClick={() => removeExp(e.id)}
                    data-testid={`delete-expense-${e.id}`}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
