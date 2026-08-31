import React, { act } from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider, useAuth } from "./AuthContext";
import api from "../lib/api";

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

const ConsumerComponent = () => {
  const { user, ready } = useAuth();
  return (
    <div>
      <div data-testid="ready">{ready ? "ready" : "not-ready"}</div>
      <div data-testid="user">{user ? user.email : "no-user"}</div>
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
});
