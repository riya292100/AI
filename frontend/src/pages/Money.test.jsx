import { act } from "react";
import ReactDOM from "react-dom/client";
import Money from "./Money";
import api from "../lib/api";

jest.mock("../lib/api", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

function changeInput(element, value) {
  const setter =
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set ||
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")?.set;
  setter.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("Money Page", () => {
  let container;
  let root;
  let currentBills;
  let currentExpenses;

  const nowIso = new Date().toISOString();

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = ReactDOM.createRoot(container);
    jest.clearAllMocks();

    currentBills = [
      {
        id: "b1",
        name: "Internet Fiber",
        amount: 60,
        due_date: "2026-06-15",
        category: "utilities",
        frequency: "monthly",
        status: "pending",
      },
      {
        id: "b2",
        name: "Apartment Rent",
        amount: 1500,
        due_date: "2026-06-01",
        category: "housing",
        frequency: "monthly",
        status: "paid",
      },
    ];

    currentExpenses = [
      {
        id: "e1",
        amount: 45.5,
        category: "groceries",
        notes: "Supermarket",
        date: nowIso,
      },
    ];

    api.get.mockImplementation((url) => {
      if (url === "/bills") return Promise.resolve({ data: [...currentBills] });
      if (url === "/expenses") return Promise.resolve({ data: [...currentExpenses] });
      return Promise.resolve({ data: [] });
    });

    api.post.mockImplementation((url, data) => {
      if (url === "/bills") {
        const b = { id: "b" + (currentBills.length + 1), status: "pending", ...data };
        currentBills.push(b);
        return Promise.resolve({ data: b });
      }
      if (url === "/expenses") {
        const e = { id: "e" + (currentExpenses.length + 1), date: nowIso, ...data };
        currentExpenses.push(e);
        return Promise.resolve({ data: e });
      }
      return Promise.resolve({ data });
    });

    api.delete.mockImplementation((url) => {
      if (url.startsWith("/bills/")) {
        const id = url.split("/")[2];
        currentBills = currentBills.filter((b) => b.id !== id);
      }
      if (url.startsWith("/expenses/")) {
        const id = url.split("/")[2];
        currentExpenses = currentExpenses.filter((e) => e.id !== id);
      }
      return Promise.resolve({ data: { success: true } });
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  test("renders KPI cards and default bills list", async () => {
    await act(async () => {
      root.render(<Money />);
    });

    expect(container.querySelector('[data-testid="money-page"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="money-kpi-owed"]').textContent).toContain("$60.00");
    expect(container.querySelector('[data-testid="money-kpi-spent"]').textContent).toContain("$45.50");
    expect(container.textContent).toContain("Internet Fiber");
    expect(container.textContent).toContain("Apartment Rent");
  });

  test("switches between bills and expenses tabs", async () => {
    await act(async () => {
      root.render(<Money />);
    });

    const expTab = container.querySelector('[data-testid="tab-expenses"]');
    await act(async () => {
      expTab.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector('[data-testid="expenses-list"]')).not.toBeNull();
    expect(container.textContent).toContain("groceries");
    expect(container.textContent).toContain("Supermarket");

    const billsTab = container.querySelector('[data-testid="tab-bills"]');
    await act(async () => {
      billsTab.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector('[data-testid="bills-list"]')).not.toBeNull();
    expect(container.textContent).toContain("Internet Fiber");
  });

  test("adds a new bill", async () => {
    await act(async () => {
      root.render(<Money />);
    });

    const nameInput = container.querySelector('[data-testid="bill-name-input"]');
    const amountInput = container.querySelector('[data-testid="bill-amount-input"]');
    const dueInput = container.querySelector('[data-testid="bill-due-input"]');
    const form = container.querySelector('[data-testid="add-bill-form"]');

    act(() => {
      changeInput(nameInput, "Electric Utility");
      changeInput(amountInput, "85");
      changeInput(dueInput, "2026-06-20");
    });

    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(api.post).toHaveBeenCalledWith("/bills", expect.objectContaining({
      name: "Electric Utility",
      amount: 85,
      due_date: "2026-06-20",
    }));
    expect(container.textContent).toContain("Electric Utility");
  });

  test("marks pending bill as paid", async () => {
    api.patch.mockResolvedValueOnce({
      data: { ...currentBills[0], status: "paid" },
    });

    await act(async () => {
      root.render(<Money />);
    });

    const markPaidBtn = container.querySelector('button[title="Mark paid"]');
    expect(markPaidBtn).not.toBeNull();

    await act(async () => {
      markPaidBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(api.patch).toHaveBeenCalledWith("/bills/b1", { status: "paid" });
  });

  test("deletes a bill", async () => {
    await act(async () => {
      root.render(<Money />);
    });

    const deleteBtn = container.querySelector('[data-testid="delete-bill-b1"]');
    expect(deleteBtn).not.toBeNull();

    await act(async () => {
      deleteBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(api.delete).toHaveBeenCalledWith("/bills/b1");
    expect(container.textContent).not.toContain("Internet Fiber");
  });

  test("logs and deletes an expense", async () => {
    await act(async () => {
      root.render(<Money />);
    });

    // Switch to expenses tab
    const expTab = container.querySelector('[data-testid="tab-expenses"]');
    await act(async () => {
      expTab.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const amtInput = container.querySelector('[data-testid="expense-amount-input"]');
    const catInput = container.querySelector('[data-testid="expense-cat-input"]');
    const notesInput = container.querySelector('[data-testid="expense-notes-input"]');
    const form = container.querySelector('[data-testid="add-expense-form"]');

    act(() => {
      changeInput(amtInput, "12.5");
      changeInput(catInput, "coffee");
      changeInput(notesInput, "Espresso bar");
    });

    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(api.post).toHaveBeenCalledWith("/expenses", expect.objectContaining({
      amount: 12.5,
      category: "coffee",
      notes: "Espresso bar",
    }));
    expect(container.textContent).toContain("Espresso bar");

    // Delete the newly logged expense
    const delExpBtn = container.querySelector('[data-testid="delete-expense-e2"]');
    expect(delExpBtn).not.toBeNull();

    await act(async () => {
      delExpBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(api.delete).toHaveBeenCalledWith("/expenses/e2");
    expect(container.textContent).not.toContain("Espresso bar");
  });
});
