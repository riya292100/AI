import { act } from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider, useAuth } from "./AuthContext";
import api, { setAuthToken } from "../lib/api";

jest.mock("../lib/api", () => {
  const mockApi = {
    get: jest.fn(),
    post: jest.fn(),
    defaults: { headers: { common: {} } },
  };
  return {
    __esModule: true,
    default: mockApi,
    setAuthToken: jest.fn(),
    formatApiErrorDetail: (detail) => detail || "Error",
  };
});

let capturedContext = null;

const ConsumerComponent = () => {
  const auth = useAuth();
  capturedContext = auth;
  const { user, ready } = auth;
  return (
    <div>
      <div data-testid="ready">{ready ? "ready" : "not-ready"}</div>
      <div data-testid="user">{user ? user.email : "no-user"}</div>
      <button data-testid="btn-login" onClick={() => auth.login("test@example.com", "pass123")}>
        Login
      </button>
      <button data-testid="btn-logout" onClick={() => auth.logout()}>
        Logout
      </button>
      <button data-testid="btn-google" onClick={() => auth.loginWithGoogle()}>
        Google
      </button>
    </div>
  );
};

describe("AuthContext", () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = ReactDOM.createRoot(container);
    capturedContext = null;
    jest.clearAllMocks();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  test("initializes and handles unauthenticated state", async () => {
    api.get.mockRejectedValueOnce(new Error("Unauthorized"));

    await act(async () => {
      root.render(
        <AuthProvider>
          <ConsumerComponent />
        </AuthProvider>
      );
    });

    expect(container.querySelector('[data-testid="ready"]').textContent).toBe("ready");
    expect(container.querySelector('[data-testid="user"]').textContent).toBe("no-user");
  });

  test("initializes and populates authenticated user", async () => {
    api.get.mockResolvedValueOnce({
      data: { id: "u-123", email: "auth@example.com", name: "Auth User" },
    });

    await act(async () => {
      root.render(
        <AuthProvider>
          <ConsumerComponent />
        </AuthProvider>
      );
    });

    expect(container.querySelector('[data-testid="ready"]').textContent).toBe("ready");
    expect(container.querySelector('[data-testid="user"]').textContent).toBe("auth@example.com");
  });

  test("handles login fallback when firebase credentials are not configured", async () => {
    api.get.mockRejectedValueOnce(new Error("Unauthorized"));

    await act(async () => {
      root.render(
        <AuthProvider>
          <ConsumerComponent />
        </AuthProvider>
      );
    });

    api.post.mockResolvedValueOnce({
      data: { id: "u-456", email: "test@example.com", name: "Test User", token: "tok_456" },
    });

    let res;
    await act(async () => {
      res = await capturedContext.login("test@example.com", "pass123");
    });

    expect(res.ok).toBe(true);
    expect(setAuthToken).toHaveBeenCalledWith("tok_456");
    expect(container.querySelector('[data-testid="user"]').textContent).toBe("test@example.com");
  });

  test("loginWithGoogle returns informative message when Firebase credentials missing", async () => {
    api.get.mockRejectedValueOnce(new Error("Unauthorized"));

    await act(async () => {
      root.render(
        <AuthProvider>
          <ConsumerComponent />
        </AuthProvider>
      );
    });

    let res;
    await act(async () => {
      res = await capturedContext.loginWithGoogle();
    });

    expect(res.ok).toBe(false);
    expect(res.error).toContain("Firebase is not configured");
  });

  test("logout clears auth token and user state", async () => {
    api.get.mockResolvedValueOnce({
      data: { id: "u-123", email: "auth@example.com", name: "Auth User" },
    });

    await act(async () => {
      root.render(
        <AuthProvider>
          <ConsumerComponent />
        </AuthProvider>
      );
    });

    api.post.mockResolvedValueOnce({ data: { ok: true } });

    await act(async () => {
      await capturedContext.logout();
    });

    expect(setAuthToken).toHaveBeenCalledWith(null);
    expect(container.querySelector('[data-testid="user"]').textContent).toBe("no-user");
  });
});
