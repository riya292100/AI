import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import api from "../lib/api";
import { logError } from "../lib/logger";

/**
 * Custom hook to manage financial records (bills & expenses), summaries, and aggregations.
 */
export function useMoneyData() {
  const [bills, setBills] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, e] = await Promise.all([api.get("/bills"), api.get("/expenses")]);
      setBills(b.data || []);
      setExpenses(e.data || []);
    } catch (err) {
      logError("useMoneyData:load", err);
      toast.error("Unable to load bills and expenses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const onRefresh = () => load();
    window.addEventListener("lifeos:refresh", onRefresh);
    return () => window.removeEventListener("lifeos:refresh", onRefresh);
  }, [load]);

  const monthTotal = useMemo(() => {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return expenses
      .filter((e) => new Date(e.date) >= start)
      .reduce((s, e) => s + Number(e.amount || 0), 0);
  }, [expenses]);

  const upcomingTotal = useMemo(
    () =>
      bills
        .filter((b) => b.status !== "paid")
        .reduce((s, b) => s + Number(b.amount || 0), 0),
    [bills]
  );

  const byCategory = useMemo(() => {
    const map = {};
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    expenses.forEach((e) => {
      if (new Date(e.date) >= start) {
        map[e.category] = (map[e.category] || 0) + Number(e.amount || 0);
      }
    });

    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [expenses]);

  const addBill = async (billData) => {
    try {
      const payload = { ...billData, amount: parseFloat(billData.amount) };
      await api.post("/bills", payload);
      toast.success("Bill added");
      await load();
      return true;
    } catch (err) {
      logError("useMoneyData:addBill", err);
      toast.error(err.response?.data?.error || "Could not add bill");
      return false;
    }
  };

  const addExpense = async (expenseData) => {
    try {
      const payload = {
        amount: parseFloat(expenseData.amount),
        category: expenseData.category,
        notes: expenseData.notes,
      };
      await api.post("/expenses", payload);
      toast.success("Expense logged");
      await load();
      return true;
    } catch (err) {
      logError("useMoneyData:addExpense", err);
      toast.error("Could not log expense");
      return false;
    }
  };

  const toggleBillPaid = async (bill) => {
    try {
      await api.patch(`/bills/${bill.id}`, { status: "paid" });
      toast.success(`${bill.name || "Bill"} marked paid`);
      await load();
      return true;
    } catch (err) {
      logError("useMoneyData:toggleBillPaid", err);
      toast.error("Could not update bill");
      return false;
    }
  };

  const deleteBill = async (id) => {
    try {
      await api.delete(`/bills/${id}`);
      toast.success("Bill deleted");
      await load();
    } catch (err) {
      logError("useMoneyData:deleteBill", err);
      toast.error("Could not delete bill");
    }
  };

  const deleteExpense = async (id) => {
    try {
      await api.delete(`/expenses/${id}`);
      toast.success("Expense deleted");
      await load();
    } catch (err) {
      logError("useMoneyData:deleteExpense", err);
      toast.error("Could not delete expense");
    }
  };

  return {
    bills,
    expenses,
    loading,
    monthTotal,
    upcomingTotal,
    byCategory,
    load,
    addBill,
    addExpense,
    toggleBillPaid,
    deleteBill,
    deleteExpense,
  };
}

export default useMoneyData;
