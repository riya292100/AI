import { act } from "react";
import ReactDOM from "react-dom/client";
import Tasks from "./Tasks";
import api from "../lib/api";

jest.mock("../lib/api");
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

describe("Tasks Page", () => {
  let container;
  let root;

  const mockTasks = [
    { id: "t1", title: "Review pull requests", priority: "high", category: "work", status: "todo", due_date: "2026-06-20" },
    { id: "t2", title: "Water the plants", priority: "low", category: "home", status: "done", due_date: null },
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

  test("renders task list and filter buttons", async () => {
    await act(async () => {
      root.render(<Tasks />);
    });

    expect(container.querySelector('[data-testid="tasks-page"]')).not.toBeNull();
    expect(container.textContent).toContain("Review pull requests");
    expect(container.textContent).toContain("Water the plants");

    const allFilter = container.querySelector('[data-testid="task-filter-all"]');
    const doneFilter = container.querySelector('[data-testid="task-filter-done"]');
    expect(allFilter).not.toBeNull();
    expect(doneFilter).not.toBeNull();
  });

  test("filters task list by status", async () => {
    await act(async () => {
      root.render(<Tasks />);
    });

    const doneFilter = container.querySelector('[data-testid="task-filter-done"]');
    await act(async () => {
      doneFilter.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("Water the plants");
    expect(container.textContent).not.toContain("Review pull requests");
  });

  test("adds a new task through form submission", async () => {
    const created = {
      id: "t3",
      title: "Grocery shopping",
      priority: "medium",
      category: "errands",
      status: "todo",
      due_date: "2026-06-25",
    };
    api.post.mockResolvedValueOnce({ data: created });

    await act(async () => {
      root.render(<Tasks />);
    });

    const titleInput = container.querySelector('[data-testid="new-task-title"]');
    const form = container.querySelector('[data-testid="add-task-form"]');

    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(titleInput, "Grocery shopping");
      titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      titleInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(api.post).toHaveBeenCalledWith("/tasks", expect.objectContaining({
      title: "Grocery shopping",
    }));
    expect(container.textContent).toContain("Grocery shopping");
  });

  test("toggles task status", async () => {
    api.patch.mockResolvedValueOnce({ data: { id: "t1", status: "done" } });

    await act(async () => {
      root.render(<Tasks />);
    });

    const toggleBtn = container.querySelector('[data-testid="toggle-task-t1"]');
    expect(toggleBtn).not.toBeNull();

    await act(async () => {
      toggleBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(api.patch).toHaveBeenCalledWith("/tasks/t1", { status: "done" });
  });

  test("deletes task", async () => {
    api.delete.mockResolvedValueOnce({ data: { ok: true } });

    await act(async () => {
      root.render(<Tasks />);
    });

    const deleteBtn = container.querySelector('[data-testid="delete-task-t1"]');
    expect(deleteBtn).not.toBeNull();

    await act(async () => {
      deleteBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(api.delete).toHaveBeenCalledWith("/tasks/t1");
    expect(container.querySelector('[data-testid="task-item-t1"]')).toBeNull();
  });
});
