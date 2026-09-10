import {
  currency,
  formatDate,
  formatTime,
  daysBetween,
  monthMatrix,
  isSameDay,
  toDatetimeLocal,
} from "./formatters";

describe("formatters library", () => {
  describe("currency", () => {
    test("formats valid positive amount as USD by default", () => {
      const formatted = currency(1234.5);
      expect(formatted).toMatch(/\$1,234\.50/);
    });

    test("formats 0 and empty/null gracefully", () => {
      expect(currency(0)).toMatch(/\$0\.00/);
      expect(currency(null)).toMatch(/\$0\.00/);
      expect(currency(undefined)).toMatch(/\$0\.00/);
      expect(currency("invalid")).toMatch(/\$0\.00/);
    });

    test("supports alternative currency codes", () => {
      const formatted = currency(50, "EUR");
      expect(formatted).toMatch(/50/);
    });
  });

  describe("formatDate", () => {
    test("formats valid ISO string", () => {
      const d = "2026-06-15T12:00:00Z";
      const formatted = formatDate(d);
      expect(formatted).toContain("Jun");
      expect(formatted).toContain("15");
    });

    test("returns empty string on null or undefined or invalid date", () => {
      expect(formatDate(null)).toBe("");
      expect(formatDate(undefined)).toBe("");
      expect(formatDate("not-a-date")).toBe("");
    });
  });

  describe("formatTime", () => {
    test("formats valid time string", () => {
      const d = new Date(2026, 5, 15, 9, 30);
      const formatted = formatTime(d);
      expect(formatted).toMatch(/9:30/);
    });

    test("returns empty string on invalid inputs", () => {
      expect(formatTime(null)).toBe("");
      expect(formatTime("invalid")).toBe("");
    });
  });

  describe("daysBetween", () => {
    test("calculates day difference accurately", () => {
      const today = new Date(2026, 0, 10);
      const target = new Date(2026, 0, 15);
      expect(daysBetween(target, today)).toBe(5);

      const past = new Date(2026, 0, 7);
      expect(daysBetween(past, today)).toBe(-3);
    });

    test("handles invalid inputs safely", () => {
      expect(daysBetween(null)).toBe(0);
      expect(daysBetween("invalid")).toBe(0);
    });
  });

  describe("monthMatrix", () => {
    test("constructs 7-column grid of dates and pads with null", () => {
      // March 2026: March 1 is Sunday -> in Monday-first (Mon=0..Sun=6), Sunday has startWeekday = 6
      const matrix = monthMatrix(2026, 2);
      expect(matrix.length % 7).toBe(0);
      // Valid Date objects should be present
      const datesOnly = matrix.filter(Boolean);
      expect(datesOnly.length).toBe(31);
      expect(datesOnly[0].getDate()).toBe(1);
      expect(datesOnly[30].getDate()).toBe(31);
    });
  });

  describe("isSameDay", () => {
    test("correctly compares two dates", () => {
      const a = new Date(2026, 3, 10, 8, 0);
      const b = new Date(2026, 3, 10, 18, 30);
      const c = new Date(2026, 3, 11, 8, 0);

      expect(isSameDay(a, b)).toBe(true);
      expect(isSameDay(a, c)).toBe(false);
      expect(isSameDay(null, a)).toBe(false);
    });
  });

  describe("toDatetimeLocal", () => {
    test("formats date into HTML datetime-local input string", () => {
      const d = new Date(2026, 8, 5);
      const val = toDatetimeLocal(d, "14:30");
      expect(val).toBe("2026-09-05T14:30");
    });
  });
});
