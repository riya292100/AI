import { act } from "react";
import ReactDOM from "react-dom/client";
import Register from "./Register";

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

const mockRegister = jest.fn();
const mockLogin = jest.fn();
const mockLoginWithGoogle = jest.fn();
let mockIsFirebaseConfigured = false;

jest.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    register: mockRegister,
    login: mockLogin,
    loginWithGoogle: mockLoginWithGoogle,
    isFirebaseConfigured: mockIsFirebaseConfigured,
  }),
}));

function changeInput(element, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  setter.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("Register Page", () => {
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

  test("renders register form with fields and buttons", async () => {
    await act(async () => {
      root.render(<Register />);
    });

    expect(container.querySelector('[data-testid="register-page"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="register-name-input"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="register-email-input"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="register-password-input"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="register-submit-button"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="google-signup-button"]')).not.toBeNull();
  });

  test("toggles password visibility", async () => {
    await act(async () => {
      root.render(<Register />);
    });

    const passwordInput = container.querySelector('[data-testid="register-password-input"]');
    expect(passwordInput.type).toBe("password");

    const toggleBtn = container.querySelector('button[aria-label="Show password"]');
    expect(toggleBtn).not.toBeNull();

    await act(async () => {
      toggleBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(passwordInput.type).toBe("text");
  });

  test("submits registration form successfully and navigates", async () => {
    mockRegister.mockResolvedValueOnce({ ok: true });

    await act(async () => {
      root.render(<Register />);
    });

    const nameInput = container.querySelector('[data-testid="register-name-input"]');
    const emailInput = container.querySelector('[data-testid="register-email-input"]');
    const passwordInput = container.querySelector('[data-testid="register-password-input"]');
    const submitBtn = container.querySelector('[data-testid="register-submit-button"]');

    act(() => {
      changeInput(nameInput, "Bob Smith");
      changeInput(emailInput, "bob@test.com");
      changeInput(passwordInput, "password123");
    });

    await act(async () => {
      submitBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(mockRegister).toHaveBeenCalledWith("bob@test.com", "password123", "Bob Smith");
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  test("displays error message on failed registration", async () => {
    mockRegister.mockResolvedValueOnce({ ok: false, error: "Email already in use" });

    await act(async () => {
      root.render(<Register />);
    });

    const submitBtn = container.querySelector('[data-testid="register-submit-button"]');

    await act(async () => {
      submitBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
    });

    const err = container.querySelector('[data-testid="register-error"]');
    expect(err).not.toBeNull();
    expect(err.textContent).toContain("Email already in use");
  });

  test("uses demo fallback for Google Sign-Up when Firebase not configured", async () => {
    mockIsFirebaseConfigured = false;
    mockLogin.mockResolvedValueOnce({ ok: true });

    await act(async () => {
      root.render(<Register />);
    });

    const googleBtn = container.querySelector('[data-testid="google-signup-button"]');
    await act(async () => {
      googleBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(mockLogin).toHaveBeenCalledWith("demo@lifeos.app", "lifeos123");
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});
