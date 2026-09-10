import { act } from "react";
import ReactDOM from "react-dom/client";
import More from "./More";
import api from "../lib/api";

const mockNavigate = jest.fn();
const mockLogout = jest.fn().mockResolvedValue(undefined);

jest.mock(
  "react-router-dom",
  () => ({
    useNavigate: () => mockNavigate,
  }),
  { virtual: true }
);

jest.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u-123", name: "Alice Developer", email: "alice@example.com" },
    logout: mockLogout,
  }),
}));

jest.mock("../lib/api", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

describe("More Page Component", () => {
  let container;
  let root;

  function setNativeValue(element, value) {
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    if (valueSetter) {
      valueSetter.call(element, value);
    } else {
      element.value = value;
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = ReactDOM.createRoot(container);
    jest.clearAllMocks();

    api.get.mockImplementation((url) => {
      if (url === "/documents") {
        return Promise.resolve({
          data: [
            {
              id: "doc-1",
              name: "Passport",
              type: "id",
              expiry_date: "2030-01-01",
            },
          ],
        });
      }
      if (url === "/habits") {
        return Promise.resolve({
          data: [
            {
              id: "h-1",
              name: "Drink 2L water",
              target_days_per_week: 7,
              logs: [],
            },
          ],
        });
      }
      if (url === "/shopping") {
        return Promise.resolve({
          data: [
            {
              id: "s-1",
              name: "Oat milk",
              checked: false,
            },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    api.post.mockResolvedValue({ data: { success: true } });
    api.patch.mockResolvedValue({ data: { success: true } });
    api.delete.mockResolvedValue({ data: { success: true } });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  test("renders documents tab by default and allows adding and deleting documents", async () => {
    await act(async () => {
      root.render(<More />);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(container.querySelector('[data-testid="more-page"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="documents-list"]')).not.toBeNull();
    expect(container.textContent).toContain("Passport");

    // Add document
    const nameInput = container.querySelector('[data-testid="doc-name-input"]');
    const docForm = container.querySelector('[data-testid="add-doc-form"]');
    await act(async () => {
      setNativeValue(nameInput, "Health Insurance");
    });
    await act(async () => {
      docForm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(api.post).toHaveBeenCalledWith(
      "/documents",
      expect.objectContaining({ name: "Health Insurance", type: "id" })
    );

    // Delete document
    const deleteBtn = container.querySelector('[data-testid="delete-doc-doc-1"]');
    expect(deleteBtn).not.toBeNull();
    await act(async () => {
      deleteBtn.click();
    });
    expect(api.delete).toHaveBeenCalledWith("/documents/doc-1");
  });

  test("switches to Habits tab and allows adding, logging, and deleting habits", async () => {
    await act(async () => {
      root.render(<More />);
    });

    const habitsTab = container.querySelector('[data-testid="tab-habits"]');
    await act(async () => {
      habitsTab.click();
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(container.querySelector('[data-testid="habits-list"]')).not.toBeNull();
    expect(container.textContent).toContain("Drink 2L water");

    // Log habit
    const logBtn = container.querySelector('[data-testid="toggle-habit-h-1"]');
    await act(async () => {
      logBtn.click();
    });
    expect(api.post).toHaveBeenCalledWith(
      "/habits/h-1/log",
      expect.objectContaining({ date: expect.any(String) })
    );

    // Add habit
    const habitInput = container.querySelector('[data-testid="habit-name-input"]');
    const habitForm = container.querySelector('[data-testid="add-habit-form"]');
    await act(async () => {
      setNativeValue(habitInput, "Daily meditation");
    });
    await act(async () => {
      habitForm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(api.post).toHaveBeenCalledWith("/habits", { name: "Daily meditation" });

    // Delete habit
    const deleteBtn = container.querySelector('[data-testid="delete-habit-h-1"]');
    await act(async () => {
      deleteBtn.click();
    });
    expect(api.delete).toHaveBeenCalledWith("/habits/h-1");
  });

  test("switches to Shopping tab and allows adding, toggling, and deleting shopping items", async () => {
    await act(async () => {
      root.render(<More />);
    });

    const shoppingTab = container.querySelector('[data-testid="tab-shopping"]');
    await act(async () => {
      shoppingTab.click();
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(container.querySelector('[data-testid="shopping-list"]')).not.toBeNull();
    expect(container.textContent).toContain("Oat milk");

    // Toggle shopping item
    const toggleBtn = container.querySelector('[data-testid="toggle-shopping-s-1"]');
    await act(async () => {
      toggleBtn.click();
    });
    expect(api.patch).toHaveBeenCalledWith("/shopping/s-1");

    // Add shopping item
    const shoppingInput = container.querySelector('[data-testid="shopping-name-input"]');
    const shoppingForm = container.querySelector('[data-testid="add-shopping-form"]');
    await act(async () => {
      setNativeValue(shoppingInput, "Dark Chocolate");
    });
    await act(async () => {
      shoppingForm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(api.post).toHaveBeenCalledWith("/shopping", { name: "Dark Chocolate", quantity: 1 });

    // Delete shopping item
    const deleteBtn = container.querySelector('[data-testid="delete-shopping-s-1"]');
    await act(async () => {
      deleteBtn.click();
    });
    expect(api.delete).toHaveBeenCalledWith("/shopping/s-1");
  });

  test("triggers logout and navigates to login", async () => {
    await act(async () => {
      root.render(<More />);
    });

    const logoutBtn = container.querySelector('[data-testid="logout-button"]');
    await act(async () => {
      logoutBtn.click();
    });

    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  test("handles API errors gracefully when fetching or saving items", async () => {
    api.get.mockRejectedValue(new Error("Network Error"));
    api.post.mockRejectedValue(new Error("Network Error"));

    await act(async () => {
      root.render(<More />);
    });

    // Form submit when empty shouldn't throw
    const docForm = container.querySelector('[data-testid="add-doc-form"]');
    await act(async () => {
      docForm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(api.post).not.toHaveBeenCalled();
  });
});
