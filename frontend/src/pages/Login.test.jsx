import { act } from "react";
import ReactDOM from "react-dom/client";
import Login from "./Login";

const mockNavigate = jest.fn();
jest.mock(
  "react-router-dom",
  () => ({
    Link: ({ children, to, ...props }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
    useNavigate: () => mockNavigate,
  }),
  { virtual: true }
);

const mockLogin = jest.fn();
const mockLoginWithGoogle = jest.fn();
const mockResetPassword = jest.fn();
let mockIsFirebaseConfigured = false;

jest.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    login: mockLogin,
    loginWithGoogle: mockLoginWithGoogle,
    resetPassword: mockResetPassword,
    isFirebaseConfigured: mockIsFirebaseConfigured,
  }),
}));

function changeInput(element, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  setter.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("Login Page", () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = ReactDOM.createRoot(container);
    jest.clearAllMocks();
    mockIsFirebaseConfigured = false;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  test("renders login form with inputs and buttons", async () => {
    await act(async () => {
      root.render(<Login />);
    });

    expect(container.querySelector('[data-testid="login-page"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="login-email-input"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="login-password-input"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="login-submit-button"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="google-signin-button"]')).not.toBeNull();
  });

  test("toggles password visibility", async () => {
    await act(async () => {
      root.render(<Login />);
    });

    const passwordInput = container.querySelector('[data-testid="login-password-input"]');
    expect(passwordInput.type).toBe("password");

    const toggleBtn = container.querySelector('button[aria-label="Show password"]');
    expect(toggleBtn).not.toBeNull();

    await act(async () => {
      toggleBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(passwordInput.type).toBe("text");
  });

  test("submits email and password, navigates on success", async () => {
    mockLogin.mockResolvedValueOnce({ ok: true });

    await act(async () => {
      root.render(<Login />);
    });

    const emailInput = container.querySelector('[data-testid="login-email-input"]');
    const passwordInput = container.querySelector('[data-testid="login-password-input"]');
    const submitBtn = container.querySelector('[data-testid="login-submit-button"]');

    act(() => {
      changeInput(emailInput, "alice@test.com");
      changeInput(passwordInput, "secret123");
    });

    await act(async () => {
      submitBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(mockLogin).toHaveBeenCalledWith("alice@test.com", "secret123");
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  test("displays error message when login fails", async () => {
    mockLogin.mockResolvedValueOnce({ ok: false, error: "Invalid credentials" });

    await act(async () => {
      root.render(<Login />);
    });

    const submitBtn = container.querySelector('[data-testid="login-submit-button"]');

    await act(async () => {
      submitBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
    });

    const err = container.querySelector('[data-testid="login-error"]');
    expect(err).not.toBeNull();
    expect(err.textContent).toContain("Invalid credentials");
  });

  test("uses demo fallback for Google Sign-In when Firebase not configured", async () => {
    mockIsFirebaseConfigured = false;
    mockLogin.mockResolvedValueOnce({ ok: true });

    await act(async () => {
      root.render(<Login />);
    });

    const googleBtn = container.querySelector('[data-testid="google-signin-button"]');
    await act(async () => {
      googleBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(mockLogin).toHaveBeenCalledWith("demo@lifeos.app", "lifeos123");
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});
