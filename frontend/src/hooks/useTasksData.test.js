import { act } from "react";
import ReactDOM from "react-dom/client";
import { useTasksData } from "./useTasksData";
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
  const hook = useTasksData();
  capturedHook = hook;
  return (
    <div>
      <div data-testid="loading">{hook.loading ? "loading" : "loaded"}</div>
      <div data-testid="count">{hook.items.length}</div>
      <div data-testid="filtered-count">{hook.filteredItems.length}</div>
    </div>
  );
}

describe("useTasksData hook", () => {
  let container;
  let root;

  const mockTasks = [
    { id: "t1", title: "Task 1", status: "todo", priority: "high" },
    { id: "t2", title: "Task 2", status: "done", priority: "low" },
  ];

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = ReactDOM.createRoot(container);
    jest.clearAllMocks();
    api.get.mockResolvedValue({ data: mockTasks });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  test("loads tasks and initializes filtered items", async () => {
    await act(async () => {
      root.render(<HookConsumer />);
    });

    expect(capturedHook.loading).toBe(false);
    expect(capturedHook.items).toEqual(mockTasks);
    expect(capturedHook.filteredItems).toEqual(mockTasks);
  });

  test("filters tasks by status", async () => {
    await act(async () => {
      root.render(<HookConsumer />);
    });

    act(() => {
      capturedHook.setFilter("done");
    });

    expect(capturedHook.filteredItems).toEqual([mockTasks[1]]);
  });

  test("adds a new task", async () => {
    const newTask = { id: "t3", title: "Task 3", status: "todo", priority: "medium" };
    api.post.mockResolvedValueOnce({ data: newTask });

    await act(async () => {
      root.render(<HookConsumer />);
    });

    let res;
    await act(async () => {
      res = await capturedHook.addTask({ title: "Task 3" });
    });

    expect(res.ok).toBe(true);
    expect(capturedHook.items[0]).toEqual(newTask);
  });

  test("toggles task status optimistically", async () => {
    api.patch.mockResolvedValueOnce({ data: { id: "t1", status: "done" } });

    await act(async () => {
      root.render(<HookConsumer />);
    });

    await act(async () => {
      await capturedHook.toggleTask(mockTasks[0]);
    });

    expect(capturedHook.items.find((i) => i.id === "t1").status).toBe("done");
  });

  test("deletes task optimistically", async () => {
    api.delete.mockResolvedValueOnce({ data: { ok: true } });

    await act(async () => {
      root.render(<HookConsumer />);
    });

    await act(async () => {
      await capturedHook.deleteTask("t1");
    });

    expect(capturedHook.items.find((i) => i.id === "t1")).toBeUndefined();
  });
});
