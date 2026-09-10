import { act } from "react";
import ReactDOM from "react-dom/client";
import { useMoneyData } from "./useMoneyData";
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
  const hook = useMoneyData();
  capturedHook = hook;
  return <div>Loaded</div>;
}

describe("useMoneyData hook", () => {
  let container;
  let root;

  const mockBills = [
    { id: "b1", name: "Electric", amount: 120, status: "pending" },
    { id: "b2", name: "Internet", amount: 80, status: "paid" },
  ];

  const mockExpenses = [
    { id: "e1", category: "groceries", amount: 50, date: new Date().toISOString() },
    { id: "e2", category: "groceries", amount: 30, date: new Date().toISOString() },
    { id: "e3", category: "dining", amount: 40, date: new Date().toISOString() },
  ];

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = ReactDOM.createRoot(container);
    jest.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === "/bills") return Promise.resolve({ data: mockBills });
      if (url === "/expenses") return Promise.resolve({ data: mockExpenses });
      return Promise.resolve({ data: [] });
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  test("loads bills, expenses and computes financial aggregations", async () => {
    await act(async () => {
      root.render(<HookConsumer />);
    });

    expect(capturedHook.loading).toBe(false);
    expect(capturedHook.bills).toEqual(mockBills);
    expect(capturedHook.expenses).toEqual(mockExpenses);
    // Upcoming unpaid bills: only b1 ($120)
    expect(capturedHook.upcomingTotal).toBe(120);
    // Current month total expenses: 50 + 30 + 40 = 120
    expect(capturedHook.monthTotal).toBe(120);
    // Category breakdown sorted: groceries ($80), dining ($40)
    expect(capturedHook.byCategory).toEqual([
      ["groceries", 80],
      ["dining", 40],
    ]);
  });

  test("adds a new bill", async () => {
    api.post.mockResolvedValueOnce({ data: { id: "b3", name: "Water", amount: 45 } });

    await act(async () => {
      root.render(<HookConsumer />);
    });

    let ok;
    await act(async () => {
      ok = await capturedHook.addBill({ name: "Water", amount: "45" });
    });

    expect(ok).toBe(true);
    expect(api.post).toHaveBeenCalledWith("/bills", { name: "Water", amount: 45 });
  });

  test("marks bill as paid", async () => {
    api.patch.mockResolvedValueOnce({ data: { ok: true } });

    await act(async () => {
      root.render(<HookConsumer />);
    });

    await act(async () => {
      await capturedHook.toggleBillPaid({ id: "b1" });
    });

    expect(api.patch).toHaveBeenCalledWith("/bills/b1", { status: "paid" });
  });
});
