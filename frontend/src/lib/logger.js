/**
 * Structured Client-Side Logger for LifeOS.
 *
 * Provides structured JSON formatting for errors and warnings,
 * capturing timestamps, context, error stacks, environment details,
 * and an optional reporting hook for remote telemetry (e.g. Sentry/Datadog).
 */

export function formatErrorLog(context, error, extra = {}) {
  const isErrorInstance = error instanceof Error;
  return {
    timestamp: new Date().toISOString(),
    level: "error",
    context: context || "General",
    name: isErrorInstance ? error.name : "CustomError",
    message: isErrorInstance ? error.message : String(error || "Unknown error"),
    stack: isErrorInstance && error.stack ? error.stack : null,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    url: typeof window !== "undefined" ? window.location.href : "unknown",
    ...extra,
  };
}

export function logError(context, error, extra = {}) {
  const payload = formatErrorLog(context, error, extra);

  // In test environments, suppress verbose stderr logs unless explicitly requested
  if (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "test") {
    // Silent in tests or emit custom event
  } else {
    // eslint-disable-next-line no-console
    console.error(`[LifeOS:${payload.context}]`, JSON.stringify(payload, null, 2));
  }

  // Remote telemetry hook if configured (e.g. Sentry, Datadog, or custom collector)
  if (typeof window !== "undefined" && typeof window.__LIFEOS_REPORT_ERROR__ === "function") {
    try {
      window.__LIFEOS_REPORT_ERROR__(payload);
    } catch (_telemetryErr) {
      // Safe fallback: never let telemetry error crash the app
    }
  }

  return payload;
}

export default {
  formatErrorLog,
  logError,
};
