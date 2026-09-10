import { act } from "react";
import ReactDOM from "react-dom/client";
import { useDashboardData } from "./useDashboardData";
import api from "../lib/api";

jest.mock("../lib/api");
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

let capturedHook = null;

function HookConsumer() {
  const hook = useDashboardData();
  capturedHook = hook;
  return <div>{hook.loading ? "loading" : "loaded"}</div>;
}

describe("useDashboardData hook", () => {
  let container;
  let root;

  const mockMetrics = {
    urgent_tasks: [{ id: "t1", title: "Urgent Task", status: "todo" }],
    upcoming_bills: [],
    today_appointments: [],
    stats: { open_tasks: 1, pending_bills: 0 },
  };

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = ReactDOM.createRoot(container);
    jest.clearAllMocks();
    api.get.mockResolvedValue({ data: mockMetrics });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  test("fetches dashboard metrics and computes greeting", async () => {
    await act(async () => {
      root.render(<HookConsumer />);
    });

    expect(capturedHook.loading).toBe(false);
    expect(capturedHook.data).toEqual(mockMetrics);
    expect(typeof capturedHook.greeting).toBe("string");
  });

  test("toggles urgent task", async () => {
    api.patch.mockResolvedValueOnce({ data: { ok: true } });

    await act(async () => {
      root.render(<HookConsumer />);
    });

    await act(async () => {
      await capturedHook.toggleTask({ id: "t1", status: "todo" });
    });

    expect(api.patch).toHaveBeenCalledWith("/tasks/t1", { status: "done" });
  });

  test("generates and dismisses AI daily plan", async () => {
    api.post.mockResolvedValueOnce({ data: { plan: "Focus on task 1" } });

    await act(async () => {
      root.render(<HookConsumer />);
    });

    await act(async () => {
      await capturedHook.generatePlan();
    });

    expect(capturedHook.plan).toEqual({ plan: "Focus on task 1" });

    act(() => {
      capturedHook.dismissPlan();
    });

    expect(capturedHook.plan).toBeNull();
  });
});
