import { act } from "react";
import ReactDOM from "react-dom/client";
import Layout from "./Layout";

const mockNavigate = jest.fn();
const mockLogout = jest.fn().mockResolvedValue(undefined);

jest.mock(
  "react-router-dom",
  () => ({
    useNavigate: () => mockNavigate,
    NavLink: ({ children, to, className, end, ...props }) => {
      const cls = typeof className === "function" ? className({ isActive: false }) : className;
      return (
        <a href={to} className={cls} {...props}>
          {children}
        </a>
      );
    },
    Outlet: () => <div data-testid="outlet" />,
  }),
  { virtual: true }
);

jest.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u-1", name: "Sam Wilson", email: "sam@example.com", photoURL: "https://example.com/photo.jpg" },
    logout: mockLogout,
  }),
}));

describe("Layout Component", () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = ReactDOM.createRoot(container);
    jest.clearAllMocks();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  test("renders layout with sidebar, navigation links, and user info", async () => {
    await act(async () => {
      root.render(<Layout />);
    });

    expect(container.querySelector('[data-testid="sidebar"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="bottom-nav"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="nav-home"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="nav-workspace"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="nav-tasks"]')).not.toBeNull();
    expect(container.textContent).toContain("Sam Wilson");
    expect(container.textContent).toContain("sam@example.com");

    const logoutBtn = container.querySelector('[data-testid="logout-button"]');
    expect(logoutBtn).not.toBeNull();
    await act(async () => {
      logoutBtn.click();
    });
    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  test("can toggle quick add modal", async () => {
    await act(async () => {
      root.render(<Layout />);
    });

    const quickAddBtn = container.querySelector('[data-testid="quick-add-button"]');
    expect(quickAddBtn).not.toBeNull();
    await act(async () => {
      quickAddBtn.click();
    });
  });

  test("can toggle global search modal", async () => {
    await act(async () => {
      root.render(<Layout />);
    });

    const searchBtn = container.querySelector('[data-testid="open-search-button"]');
    expect(searchBtn).not.toBeNull();
    await act(async () => {
      searchBtn.click();
    });
  });
});
