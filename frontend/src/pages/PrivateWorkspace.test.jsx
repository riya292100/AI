import { act } from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PrivateWorkspace from "./PrivateWorkspace";
import * as apiModule from "../lib/api";

jest.mock(
  "react-router-dom",
  () => ({
    useNavigate: () => jest.fn(),
  }),
  { virtual: true }
);

jest.mock("../lib/api", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  apiGet: jest.fn(),
  apiPost: jest.fn(),
  apiPatch: jest.fn(),
  apiDelete: jest.fn(),
  setAuthToken: jest.fn(),
}));

describe("PrivateWorkspace Page", () => {
  let container;
  let root;
  let queryClient;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = ReactDOM.createRoot(container);
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  test("renders login screen when session is null", async () => {
    apiModule.apiGet.mockImplementation((url) => {
      if (url === "/auth/session") return Promise.resolve(null);
      return Promise.resolve([]);
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <PrivateWorkspace />
        </QueryClientProvider>
      );
    });

    expect(container.querySelector('[data-testid="login-introduction"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="auth-demo-login-button"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="login-card-title"]').textContent).toBe("Enter your workspace");
  });

  test("clicking demo login button calls demo-login API", async () => {
    apiModule.apiGet.mockImplementation((url) => {
      if (url === "/auth/session") return Promise.resolve(null);
      return Promise.resolve([]);
    });
    apiModule.apiPost.mockResolvedValue({ token: "fake-jwt", user: { id: "u1" } });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <PrivateWorkspace />
        </QueryClientProvider>
      );
    });

    const loginBtn = container.querySelector('[data-testid="auth-demo-login-button"]');
    await act(async () => {
      loginBtn.click();
    });

    expect(apiModule.apiPost).toHaveBeenCalledWith("/auth/demo-login", {});
  });

  test("renders hardened dashboard and supports task, AI, and document interactions", async () => {
    apiModule.apiGet.mockImplementation((url) => {
      if (url === "/auth/session") {
        return Promise.resolve({
          id: "demo-user-hardened",
          email: "demo@lifeos.internal",
          display_name: "Demo User",
          auth_mode: "MOCK",
        });
      }
      if (url.startsWith("/tasks")) {
        return Promise.resolve({
          items: [
            {
              id: "t1",
              title: "Hardened task 1",
              priority: "high",
              completed: false,
              version: 1,
            },
          ],
          total: 1,
          offset: 0,
          limit: 20,
        });
      }
      if (url.startsWith("/workspace/items")) {
        return Promise.resolve({
          items: [
            {
              id: "w1",
              title: "Module reminder",
              category: "reminder",
              status: "open",
              version: 1,
            },
          ],
          total: 1,
          offset: 0,
          limit: 50,
        });
      }
      if (url === "/review/today") {
        return Promise.resolve({
          date: "2026-09-07",
          open_tasks: 1,
          open_modules: 1,
          completed_tasks: 0,
          next_actions: ["Complete task: Hardened task 1"],
          generated_locally: true,
        });
      }
      return Promise.resolve(null);
    });
    apiModule.apiPost.mockResolvedValue({ id: "t2", title: "New created task" });
    apiModule.apiPatch.mockResolvedValue({ id: "t1", completed: true });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <PrivateWorkspace />
        </QueryClientProvider>
      );
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Check dashboard layout and header
    expect(container.querySelector('[data-testid="lifeos-dashboard"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="brand-mark"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="dashboard-header"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="security-indicator-pill"]')).not.toBeNull();

    // Check KPIs
    expect(container.querySelector('[data-testid="summary-tasks-card"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="summary-focus-card"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="summary-security-card"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="summary-data-boundary"]').textContent).toBe("MongoDB");

    // Check Panels
    expect(container.querySelector('[data-testid="tasks-panel"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="arch-status-banner"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="core-modules-card"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="daily-review-card"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="ai-assistant-card"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="document-upload-card"]')).not.toBeNull();

    // Task toggle action
    const taskCheckbox = container.querySelector('[data-testid="task-item-checkbox-t1"]');
    expect(taskCheckbox).not.toBeNull();
    await act(async () => {
      taskCheckbox.click();
    });
    expect(apiModule.apiPatch).toHaveBeenCalledWith("/tasks/t1", { completed: true, version: 1 });

    function setNativeValue(element, value) {
      const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      valueSetter.call(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // Task add action
    const taskInput = container.querySelector('[data-testid="task-title-input"]');
    const taskForm = container.querySelector('[data-testid="task-create-form"]');
    await act(async () => {
      setNativeValue(taskInput, "New created task");
    });
    await act(async () => {
      taskForm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(apiModule.apiPost).toHaveBeenCalledWith("/tasks", {
      title: "New created task",
      priority: "medium",
      due_date: null,
    });

    // AI prompt action
    const aiInput = container.querySelector('[data-testid="ai-prompt-input"]');
    const aiSendBtn = container.querySelector('[data-testid="ai-send-button"]');
    await act(async () => {
      setNativeValue(aiInput, "How to plan today?");
    });
    await act(async () => {
      aiSendBtn.click();
    });
    expect(container.querySelector('[data-testid="ai-mocked-status"]')).not.toBeNull();

    // Document dropzone action
    const docInput = container.querySelector('[data-testid="document-file-input"]');
    await act(async () => {
      docInput.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(container.querySelector('[data-testid="document-mocked-status"]')).not.toBeNull();
  });
});
