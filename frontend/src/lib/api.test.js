import api, { setAuthToken, formatApiErrorDetail, API } from "./api";

describe("API Client & Helpers", () => {
  beforeEach(() => {
    localStorage.clear();
    setAuthToken(null);
  });

  test("API baseURL is defined properly", () => {
    expect(API).toBeDefined();
    expect(api.defaults.withCredentials).toBe(true);
  });

  test("setAuthToken stores token in localStorage and sets Axios auth header", () => {
    setAuthToken("sample-jwt-token-xyz");
    expect(localStorage.getItem("lifeos_token")).toBe("sample-jwt-token-xyz");
    expect(api.defaults.headers.common["Authorization"]).toBe("Bearer sample-jwt-token-xyz");

    setAuthToken(null);
    expect(localStorage.getItem("lifeos_token")).toBeNull();
    expect(api.defaults.headers.common["Authorization"]).toBeUndefined();
  });

  test("formatApiErrorDetail parses different error payloads", () => {
    expect(formatApiErrorDetail("Network error")).toBe("Network error");
    expect(formatApiErrorDetail([{ msg: "Invalid email" }])).toBe("Invalid email");
    expect(formatApiErrorDetail({ msg: "Not found" })).toBe("Not found");
    expect(formatApiErrorDetail(null)).toBe("Something went wrong. Please try again.");
  });
});
