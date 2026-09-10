import { act } from "react";
import ReactDOM from "react-dom/client";
import { useCalendarData } from "./useCalendarData";
import api from "../lib/api";

jest.mock("../lib/api");
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

let capturedHook = null;

function HookConsumer() {
  const hook = useCalendarData();
  capturedHook = hook;
  return <div>{hook.loading ? "loading" : "loaded"}</div>;
}

describe("useCalendarData hook", () => {
  let container;
  let root;

  const today = new Date();
  const mockAppts = [
    { id: "a1", title: "Dentist", starts_at: today.toISOString() },
  ];
  const mockTasks = [
    { id: "t1", title: "Submit Report", due_date: today.toISOString() },
  ];

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = ReactDOM.createRoot(container);
    jest.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === "/appointments") return Promise.resolve({ data: mockAppts });
      if (url === "/tasks") return Promise.resolve({ data: mockTasks });
      return Promise.resolve({ data: [] });
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  test("loads appointments and tasks and groups events for selected date", async () => {
    await act(async () => {
      root.render(<HookConsumer />);
    });

    expect(capturedHook.loading).toBe(false);
    expect(capturedHook.appts).toEqual(mockAppts);
    expect(capturedHook.tasks).toEqual(mockTasks);
    expect(capturedHook.selectedEvents.appts.length).toBe(1);
    expect(capturedHook.selectedEvents.tasks.length).toBe(1);
  });

  test("navigates months backward and forward", async () => {
    await act(async () => {
      root.render(<HookConsumer />);
    });

    const initialMonth = capturedHook.cursor.getMonth();

    act(() => {
      capturedHook.prevMonth();
    });
    expect(capturedHook.cursor.getMonth()).toBe((initialMonth + 11) % 12);

    act(() => {
      capturedHook.nextMonth();
    });
    expect(capturedHook.cursor.getMonth()).toBe(initialMonth);
  });

  test("adds a new appointment", async () => {
    api.post.mockResolvedValueOnce({ data: { id: "a2", title: "Doctor" } });

    await act(async () => {
      root.render(<HookConsumer />);
    });

    let ok;
    await act(async () => {
      ok = await capturedHook.addAppointment({ title: "Doctor", starts_at: today.toISOString() });
    });

    expect(ok).toBe(true);
    expect(api.post).toHaveBeenCalledWith("/appointments", expect.objectContaining({ title: "Doctor" }));
  });
});
