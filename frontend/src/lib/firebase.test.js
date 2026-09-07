import { formatFirebaseAuthError, isFirebaseConfigured } from "./firebase";

describe("Firebase Lib Utilities", () => {
  test("isFirebaseConfigured evaluates to boolean without error", () => {
    expect(typeof isFirebaseConfigured).toBe("boolean");
  });

  test("formatFirebaseAuthError maps common Firebase Auth error codes", () => {
    expect(formatFirebaseAuthError({ code: "auth/invalid-credential" })).toContain(
      "Invalid email or password"
    );
    expect(formatFirebaseAuthError({ code: "auth/email-already-in-use" })).toContain(
      "already exists"
    );
    expect(formatFirebaseAuthError({ code: "auth/weak-password" })).toContain("too weak");
    expect(formatFirebaseAuthError({ code: "auth/popup-closed-by-user" })).toContain(
      "closed before completing"
    );
    expect(formatFirebaseAuthError({ code: "auth/unauthorized-domain" })).toContain(
      "Domain not authorized"
    );
  });

  test("formatFirebaseAuthError falls back to default error message", () => {
    expect(formatFirebaseAuthError(null)).toContain("unexpected error occurred");
    expect(formatFirebaseAuthError({ message: "Custom firebase error" })).toBe(
      "Custom firebase error"
    );
  });
});
