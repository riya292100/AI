import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import api from "../lib/api";

/**
 * Custom hook to manage LifeOS dashboard metrics, AI planning, and task toggles.
 */
export function useDashboardData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("Hello");
  const [planning, setPlanning] = useState(false);
  const [plan, setPlan] = useState(null);

  const calculateGreeting = useCallback(() => {
    const h = new Date().getHours();
    return h < 5
      ? "Still up"
      : h < 12
      ? "Good morning"
      : h < 18
      ? "Good afternoon"
      : "Good evening";
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/dashboard");
      setData(res.data || null);
    } catch (err) {
      console.error("Failed to load dashboard metrics:", err);
      toast.error("Unable to load dashboard data. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setGreeting(calculateGreeting());
    load();

    const onRefresh = () => load();
    window.addEventListener("lifeos:refresh", onRefresh);
    return () => window.removeEventListener("lifeos:refresh", onRefresh);
  }, [calculateGreeting, load]);

  const toggleTask = async (task) => {
    if (!task?.id) return;
    const nextStatus = task.status === "done" ? "todo" : "done";
    try {
      await api.patch(`/tasks/${task.id}`, { status: nextStatus });
      await load();
    } catch (err) {
      console.error("Failed to update task:", err);
      toast.error("Could not update task status");
    }
  };

  const generatePlan = async () => {
    setPlanning(true);
    try {
      const res = await api.post("/ai/plan-day");
      setPlan(res.data || null);
      toast.success("Daily plan generated");
    } catch (err) {
      console.error("Failed to generate day plan:", err);
      toast.error("Could not generate daily plan. Try again later.");
    } finally {
      setPlanning(false);
    }
  };

  const dismissPlan = () => setPlan(null);

  return {
    data,
    loading,
    greeting,
    planning,
    plan,
    load,
    toggleTask,
    generatePlan,
    dismissPlan,
  };
}

export default useDashboardData;
