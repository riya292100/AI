import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import api from "../lib/api";
import { monthMatrix, isSameDay } from "../lib/formatters";

/**
 * Custom hook to manage calendar month navigation, appointment/task events, and scheduling.
 */
export function useCalendarData() {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(today);
  const [appts, setAppts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, t] = await Promise.all([api.get("/appointments"), api.get("/tasks")]);
      setAppts(a.data || []);
      const taskList = Array.isArray(t.data) ? t.data : t.data?.items || [];
      setTasks(taskList);
    } catch (err) {
      console.error("Failed to load appointments and tasks:", err);
      toast.error("Unable to load calendar events");
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

  const grid = useMemo(() => monthMatrix(cursor.getFullYear(), cursor.getMonth()), [cursor]);

  const eventsFor = useCallback(
    (day) => {
      if (!day) return { appts: [], tasks: [] };
      const dayAppts = appts.filter((x) => isSameDay(new Date(x.starts_at), day));
      const dayTasks = tasks.filter((x) => x.due_date && isSameDay(new Date(x.due_date), day));
      return { appts: dayAppts, tasks: dayTasks };
    },
    [appts, tasks]
  );

  const selectedEvents = useMemo(() => eventsFor(selected), [eventsFor, selected]);

  const prevMonth = () => {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const now = new Date();
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelected(now);
  };

  const addAppointment = async (form) => {
    try {
      await api.post("/appointments", form);
      toast.success("Event added");
      await load();
      return true;
    } catch (err) {
      console.error("Failed to create appointment:", err);
      toast.error("Could not create event");
      return false;
    }
  };

  const deleteAppointment = async (id) => {
    try {
      await api.delete(`/appointments/${id}`);
      toast.success("Event removed");
      await load();
      return true;
    } catch (err) {
      console.error("Failed to delete appointment:", err);
      toast.error("Could not delete event");
      return false;
    }
  };

  return {
    cursor,
    setCursor,
    selected,
    setSelected,
    appts,
    tasks,
    loading,
    grid,
    eventsFor,
    selectedEvents,
    prevMonth,
    nextMonth,
    goToToday,
    addAppointment,
    deleteAppointment,
    load,
  };
}

export default useCalendarData;
