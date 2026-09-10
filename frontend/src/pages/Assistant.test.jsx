import { act } from "react";
import ReactDOM from "react-dom/client";
import { TextEncoder, TextDecoder } from "util";
import Assistant from "./Assistant";
import api from "../lib/api";

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

jest.mock("../lib/api", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
  API: "http://localhost:8000",
}));

function changeInput(element, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  setter.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function createStreamResponse(lines) {
  const encoder = new TextEncoder();
  let index = 0;
  return {
    ok: true,
    status: 200,
    body: {
      getReader: () => ({
        read: () => {
          if (index < lines.length) {
            return Promise.resolve({
              value: encoder.encode(lines[index++]),
              done: false,
            });
          }
          return Promise.resolve({ value: undefined, done: true });
        },
      }),
    },
  };
}

describe("Assistant Page", () => {
  let container;
  let root;
  const originalFetch = window.fetch;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = ReactDOM.createRoot(container);
    jest.clearAllMocks();
    window.fetch = jest.fn();
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    window.fetch = originalFetch;
  });

  test("renders suggestions when past messages are empty", async () => {
    api.get.mockResolvedValueOnce({ data: [] });

    await act(async () => {
      root.render(<Assistant />);
    });

    expect(container.querySelector('[data-testid="assistant-page"]')).not.toBeNull();
    expect(container.textContent).toContain("How can I help today?");
    expect(container.textContent).toContain("What should I focus on today?");
  });

  test("renders past messages loaded from API", async () => {
    api.get.mockResolvedValueOnce({
      data: [
        { id: "m1", role: "user", content: "What bills do I have?" },
        { id: "m2", role: "assistant", content: "You have 2 pending bills this month." },
      ],
    });

    await act(async () => {
      root.render(<Assistant />);
    });

    expect(container.textContent).toContain("What bills do I have?");
    expect(container.textContent).toContain("You have 2 pending bills this month.");
  });

  test("sends message and handles streaming response", async () => {
    api.get.mockResolvedValueOnce({ data: [] });
    window.fetch.mockResolvedValueOnce(
      createStreamResponse([
        'data: {"type":"delta","content":"Here is your "}\n\n',
        'data: {"type":"delta","content":"schedule for today."}\n\n',
      ])
    );

    await act(async () => {
      root.render(<Assistant />);
    });

    const input = container.querySelector('[data-testid="chat-input"]');
    const form = container.querySelector('[data-testid="chat-form"]');

    act(() => {
      changeInput(input, "What is my plan?");
    });

    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 60));
    });

    expect(window.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/ai/chat",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ message: "What is my plan?" }),
      })
    );

    expect(container.textContent).toContain("What is my plan?");
    expect(container.textContent).toContain("Here is your schedule for today.");
  });

  test("clicking a suggestion triggers assistant message", async () => {
    api.get.mockResolvedValueOnce({ data: [] });
    window.fetch.mockResolvedValueOnce(
      createStreamResponse([
        'data: {"type":"delta","content":"Focus on your top priority project."}\n\n',
      ])
    );

    await act(async () => {
      root.render(<Assistant />);
    });

    const suggestionBtn = container.querySelector('[data-testid="chat-suggestion-0"]');
    expect(suggestionBtn).not.toBeNull();

    await act(async () => {
      suggestionBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 60));
    });

    expect(window.fetch).toHaveBeenCalled();
    expect(container.textContent).toContain("Focus on your top priority project.");
  });

  test("displays graceful error message if chat service fails", async () => {
    api.get.mockResolvedValueOnce({ data: [] });
    window.fetch.mockRejectedValueOnce(new Error("Network Error"));

    await act(async () => {
      root.render(<Assistant />);
    });

    const input = container.querySelector('[data-testid="chat-input"]');
    const form = container.querySelector('[data-testid="chat-form"]');

    act(() => {
      changeInput(input, "Hello?");
    });

    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 60));
    });

    expect(container.textContent).toContain(
      "The assistant is temporarily unavailable. Please try again."
    );
  });
});
