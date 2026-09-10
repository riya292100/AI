import { act } from "react";
import ReactDOM from "react-dom/client";
import Calendar from "./Calendar";
import api from "../lib/api";

jest.mock("../lib/api", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

function changeInput(element, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  setter.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("Calendar Page", () => {
  let container;
  let root;
  let currentAppts;
  let currentTasks;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const todayStr = `${year}-${month}-15`;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = ReactDOM.createRoot(container);
    jest.clearAllMocks();

    currentAppts = [
      {
        id: "a1",
        title: "Dentist Checkup",
        starts_at: `${todayStr}T10:00:00Z`,
        location: "Dental Clinic",
      },
    ];

    currentTasks = [
      {
        id: "t1",
        title: "Prepare presentation",
        due_date: todayStr,
      },
    ];

    api.get.mockImplementation((url) => {
      if (url === "/appointments") return Promise.resolve({ data: [...currentAppts] });
      if (url === "/tasks") return Promise.resolve({ data: [...currentTasks] });
      return Promise.resolve({ data: [] });
    });

    api.post.mockImplementation((url, data) => {
      if (url === "/appointments") {
        const a = { id: "a" + (currentAppts.length + 1), ...data };
        currentAppts.push(a);
        return Promise.resolve({ data: a });
      }
      return Promise.resolve({ data });
    });

    api.delete.mockImplementation((url) => {
      if (url.startsWith("/appointments/")) {
        const id = url.split("/")[2];
        currentAppts = currentAppts.filter((a) => a.id !== id);
      }
      return Promise.resolve({ data: { success: true } });
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  test("renders calendar grid and header", async () => {
    await act(async () => {
      root.render(<Calendar />);
    });

    expect(container.querySelector('[data-testid="calendar-page"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="calendar-grid"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="add-appt-form"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="selected-day-events"]')).not.toBeNull();
  });

  test("navigates month with prev and next buttons", async () => {
    await act(async () => {
      root.render(<Calendar />);
    });

    const header = container.querySelector("h1");
    const initialText = header.textContent;

    const nextBtn = container.querySelector('[data-testid="cal-next"]');
    await act(async () => {
      nextBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(header.textContent).not.toBe(initialText);

    const prevBtn = container.querySelector('[data-testid="cal-prev"]');
    await act(async () => {
      prevBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(header.textContent).toBe(initialText);
  });

  test("selects a specific day to view scheduled events", async () => {
    await act(async () => {
      root.render(<Calendar />);
    });

    const day15Btn = container.querySelector('[data-testid="cal-day-15"]');
    expect(day15Btn).not.toBeNull();

    await act(async () => {
      day15Btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const details = container.querySelector('[data-testid="selected-day-events"]');
    expect(details.textContent).toContain("Dentist Checkup");
    expect(details.textContent).toContain("Prepare presentation");
  });

  test("adds an appointment via schedule form", async () => {
    await act(async () => {
      root.render(<Calendar />);
    });

    // Select day 15
    const day15Btn = container.querySelector('[data-testid="cal-day-15"]');
    await act(async () => {
      day15Btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const titleInput = container.querySelector('[data-testid="appt-title-input"]');
    const timeInput = container.querySelector('[data-testid="appt-time-input"]');
    const locInput = container.querySelector('[data-testid="appt-location-input"]');
    const form = container.querySelector('[data-testid="add-appt-form"]');

    act(() => {
      changeInput(titleInput, "Team Sync");
      changeInput(timeInput, `${todayStr}T14:30`);
      changeInput(locInput, "Room 402");
    });

    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(api.post).toHaveBeenCalledWith("/appointments", expect.objectContaining({
      title: "Team Sync",
      location: "Room 402",
    }));

    const details = container.querySelector('[data-testid="selected-day-events"]');
    expect(details.textContent).toContain("Team Sync");
  });

  test("deletes an appointment", async () => {
    await act(async () => {
      root.render(<Calendar />);
    });

    // Select day 15 where Dentist Checkup is scheduled
    const day15Btn = container.querySelector('[data-testid="cal-day-15"]');
    await act(async () => {
      day15Btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const deleteBtn = container.querySelector('[data-testid="delete-appt-a1"]');
    expect(deleteBtn).not.toBeNull();

    await act(async () => {
      deleteBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(api.delete).toHaveBeenCalledWith("/appointments/a1");
    const details = container.querySelector('[data-testid="selected-day-events"]');
    expect(details.textContent).not.toContain("Dentist Checkup");
  });
});
