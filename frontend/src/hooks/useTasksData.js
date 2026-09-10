import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import api from "../lib/api";

/**
 * Custom hook to manage LifeOS task loading, filtering, optimistic updates, and deletion.
 */
export function useTasksData() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/tasks");
      const list = Array.isArray(data) ? data : data?.items || [];
      setItems(list);
    } catch (err) {
      console.error("Failed to load tasks:", err);
      toast.error("Unable to load tasks");
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

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.status === filter);
  }, [items, filter]);

  const addTask = async ({ title, priority = "medium", category = "general", due_date = null }) => {
    if (!title?.trim()) return { ok: false, error: "Title is required" };
    try {
      const payload = {
        title: title.trim(),
        priority,
        category,
        due_date: due_date || null,
      };
      const { data } = await api.post("/tasks", payload);
      setItems((prev) => [data, ...prev]);
      toast.success("Task added");
      return { ok: true, data };
    } catch (err) {
      console.error("Failed to add task:", err);
      const msg = err.response?.data?.error || err.response?.data?.detail || "Could not add task";
      toast.error(msg);
      return { ok: false, error: msg };
    }
  };

  const toggleTask = async (task) => {
    if (!task?.id) return;
    const nextStatus = task.status === "done" ? "todo" : "done";
    const previous = [...items];

    // Optimistic UI update
    setItems((prev) =>
      prev.map((it) => (it.id === task.id ? { ...it, status: nextStatus, completed: nextStatus === "done" } : it))
    );

    try {
      await api.patch(`/tasks/${task.id}`, { status: nextStatus });
    } catch (err) {
      console.error("Failed to toggle task:", err);
      toast.error("Could not update task");
      setItems(previous); // Revert on failure
    }
  };

  const deleteTask = async (id) => {
    const previous = [...items];
    // Optimistic UI update
    setItems((prev) => prev.filter((i) => i.id !== id));

    try {
      await api.delete(`/tasks/${id}`);
      toast.success("Deleted");
      return true;
    } catch (err) {
      console.error("Failed to delete task:", err);
      toast.error("Could not delete task");
      setItems(previous); // Revert on failure
      return false;
    }
  };

  return {
    items,
    filteredItems,
    filter,
    setFilter,
    loading,
    load,
    addTask,
    toggleTask,
    deleteTask,
  };
}

export default useTasksData;
