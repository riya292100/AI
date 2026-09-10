import { formatErrorLog, logError } from "./logger";

describe("Structured Client-Side Logger", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    delete window.__LIFEOS_REPORT_ERROR__;
    jest.restoreAllMocks();
  });

  test("formatErrorLog formats Error instances accurately", () => {
    const err = new Error("Failed to fetch bills");
    const log = formatErrorLog("MoneyPage", err, { extraKey: 123 });

    expect(log.level).toBe("error");
    expect(log.context).toBe("MoneyPage");
    expect(log.name).toBe("Error");
    expect(log.message).toBe("Failed to fetch bills");
    expect(typeof log.timestamp).toBe("string");
    expect(log.stack).toBeTruthy();
    expect(log.extraKey).toBe(123);
  });

  test("formatErrorLog handles string and primitive errors gracefully", () => {
    const log = formatErrorLog("Auth", "Unauthorized access");

    expect(log.level).toBe("error");
    expect(log.context).toBe("Auth");
    expect(log.name).toBe("CustomError");
    expect(log.message).toBe("Unauthorized access");
    expect(log.stack).toBeNull();
  });

  test("formatErrorLog handles null and undefined error objects", () => {
    const log = formatErrorLog(null, null);

    expect(log.context).toBe("General");
    expect(log.message).toBe("Unknown error");
  });

  test("logError outputs to console.error when not in test mode", () => {
    process.env.NODE_ENV = "development";
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const err = new Error("Network timeout");
    const payload = logError("Dashboard", err);

    expect(consoleSpy).toHaveBeenCalledWith(
      "[LifeOS:Dashboard]",
      expect.stringContaining("Network timeout")
    );
    expect(payload.message).toBe("Network timeout");
  });

  test("logError invokes remote telemetry callback when available", () => {
    const reporter = jest.fn();
    window.__LIFEOS_REPORT_ERROR__ = reporter;

    const err = new Error("Telemetry test");
    const payload = logError("Telemetry", err);

    expect(reporter).toHaveBeenCalledWith(payload);
  });

  test("logError catches and suppresses errors from telemetry hook", () => {
    window.__LIFEOS_REPORT_ERROR__ = () => {
      throw new Error("Telemetry crash");
    };

    expect(() => {
      logError("SafeTelemetry", new Error("Initial failure"));
    }).not.toThrow();
  });
});
