import { act } from "react";
import ReactDOM from "react-dom/client";
import ErrorBoundary from "./ErrorBoundary";

const BombComponent = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error("Test explosion!");
  }
  return <div>Component is healthy</div>;
};

describe("ErrorBoundary Component", () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = ReactDOM.createRoot(container);
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    console.error.mockRestore();
  });

  test("renders children normally when there is no error", () => {
    act(() => {
      root.render(
        <ErrorBoundary>
          <BombComponent shouldThrow={false} />
        </ErrorBoundary>
      );
    });
    expect(container.textContent).toContain("Component is healthy");
  });

  test("catches error and displays fallback UI", () => {
    act(() => {
      root.render(
        <ErrorBoundary>
          <BombComponent shouldThrow={true} />
        </ErrorBoundary>
      );
    });
    expect(container.querySelector('[data-testid="error-boundary-fallback"]')).not.toBeNull();
    expect(container.textContent).toContain("Something went wrong");
  });
});
