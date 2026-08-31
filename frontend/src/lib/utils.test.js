import { cn } from "./utils";
import { formatApiErrorDetail } from "./api";

describe("Utility Functions", () => {
  test("cn combines and merges tailwind classnames cleanly", () => {
    expect(cn("px-2 py-1", "bg-blue-500")).toBe("px-2 py-1 bg-blue-500");
    expect(cn("px-2", { "text-red-500": true, "hidden": false })).toBe("px-2 text-red-500");
    expect(cn("p-4", "p-2")).toBe("p-2"); // Tailwind merge overrides
  });

  test("formatApiErrorDetail extracts human-readable message", () => {
    expect(formatApiErrorDetail("Direct string error")).toBe("Direct string error");
    expect(formatApiErrorDetail([{ msg: "Email invalid" }, { msg: "Password too short" }])).toBe(
      "Email invalid Password too short"
    );
    expect(formatApiErrorDetail({ msg: "Single object error" })).toBe("Single object error");
    expect(formatApiErrorDetail(null)).toBe("Something went wrong. Please try again.");
  });
});
