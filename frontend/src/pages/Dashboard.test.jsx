import { act } from "react";
import ReactDOM from "react-dom/client";
import Dashboard from "./Dashboard";
import api from "../lib/api";

jest.mock("../lib/api");
jest.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", name: "Alex Morgan", email: "alex@lifeos.app" },
  }),
}));
jest.mock(
  "react-router-dom",
  () => ({
    useNavigate: () => jest.fn(),
    Link: ({ children, to }) => <a href={to}>{children}</a>,
  }),
  { virtual: true }
);
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

describe("Dashboard Page", () => {
  let container;
  let root;

  const mockData = {
    counts: {
      open_tasks: 3,
      due_today: 1,
      upcoming_bills: 2,
      habits: 4,
    },
    money: {
      total_owed: 250,
      month_expense: 1100,
      currency: "USD",
    },
    due_today: [
      { id: "t1", title: "File Q2 Tax Return", priority: "high", status: "todo", category: "finance" },
    ],
    upcoming_bills: [
      { id: "b1", name: "Internet Fiber", amount: 80, due_date: "2026-06-20", status: "pending" },
    ],
    today_appointments: [
      { id: "a1", title: "Strategy Sync", starts_at: "2026-06-15T14:00:00Z", location: "Zoom" },
    ],
    expiring_documents: [
      { id: "d1", name: "Passport", type: "id", days_until: 12 },
    ],
  };

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = ReactDOM.createRoot(container);
    jest.clearAllMocks();
    api.get.mockResolvedValue({ data: mockData });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  test("renders greeting and dashboard snapshot", async () => {
    await act(async () => {
      root.render(<Dashboard />);
    });

    expect(container.querySelector('[data-testid="dashboard-page"]')).not.toBeNull();
    expect(container.textContent).toContain("Alex");
    expect(container.textContent).toContain("Here's your quiet snapshot for today");
  });

  test("renders KPI metrics cards", async () => {
    await act(async () => {
      root.render(<Dashboard />);
    });

    const tasksKpi = container.querySelector('[data-testid="dashboard-kpi-tasks"]');
    expect(tasksKpi).not.toBeNull();
    expect(tasksKpi.textContent).toContain("3");

    const billsKpi = container.querySelector('[data-testid="dashboard-kpi-bills"]');
    expect(billsKpi).not.toBeNull();
    expect(billsKpi.textContent).toContain("2");
  });

  test("renders due today tasks and allows toggling status", async () => {
    api.patch.mockResolvedValueOnce({ data: { id: "t1", status: "done" } });

    await act(async () => {
      root.render(<Dashboard />);
    });

    const dueSection = container.querySelector('[data-testid="dashboard-due-today"]');
    expect(dueSection).not.toBeNull();
    expect(dueSection.textContent).toContain("File Q2 Tax Return");

    const toggleBtn = dueSection.querySelector("button.w-5.h-5");
    await act(async () => {
      toggleBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(api.patch).toHaveBeenCalledWith("/tasks/t1", { status: "done" });
  });

  test("generates and dismisses AI plan", async () => {
    api.post.mockResolvedValueOnce({
      data: {
        summary: "Focus on finalizing the tax return and attending the strategy sync.",
        focus: ["File Q2 Tax Return", "Strategy Sync"],
        schedule: [{ time: "09:00", task: "File Q2 Tax Return" }],
      },
    });

    await act(async () => {
      root.render(<Dashboard />);
    });

    const planBtn = container.querySelector('[data-testid="plan-my-day-button"]');
    expect(planBtn).not.toBeNull();

    await act(async () => {
      planBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(api.post).toHaveBeenCalledWith("/ai/plan-day");
    const planCard = container.querySelector('[data-testid="ai-plan-card"]');
    expect(planCard).not.toBeNull();
    expect(planCard.textContent).toContain("Focus on finalizing the tax return");

    const dismissBtn = planCard.querySelector("button");
    act(() => {
      dismissBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector('[data-testid="ai-plan-card"]')).toBeNull();
  });
});
