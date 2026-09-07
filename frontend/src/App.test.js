import { act } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import api from "./lib/api";

jest.mock(
  "react-router-dom",
  () => ({
    BrowserRouter: ({ children }) => <div data-testid="router">{children}</div>,
    Routes: ({ children }) => <div data-testid="routes">{children}</div>,
    Route: ({ element }) => <div>{element}</div>,
    Navigate: ({ to }) => <div data-testid={`navigate-to-${to}`} />,
    useLocation: () => ({ pathname: "/" }),
    useNavigate: () => jest.fn(),
    Link: ({ children, to }) => <a href={to}>{children}</a>,
  }),
  { virtual: true }
);

jest.mock("./lib/api", () => {
  const mockApi = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    defaults: { headers: { common: {} } },
  };
  return {
    __esModule: true,
    default: mockApi,
    setAuthToken: jest.fn(),
    formatApiErrorDetail: (detail) => detail || "Error",
  };
});

describe("App Component", () => {
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

  test("renders authenticated or login state with routes", async () => {
    api.get.mockRejectedValueOnce(new Error("Unauthorized"));

    await act(async () => {
      root.render(<App />);
    });

    expect(container.querySelector('[data-testid="router"]')).not.toBeNull();
  });
});
