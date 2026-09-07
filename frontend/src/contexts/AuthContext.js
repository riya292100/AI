import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { setAuthToken, formatApiErrorDetail } from "../lib/api";
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  isFirebaseConfigured,
  formatFirebaseAuthError,
} from "../lib/firebase";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // null=loading, false=guest, obj=user
  const [ready, setReady] = useState(false);

  // Sync token and load user profile from backend
  const syncBackendUser = useCallback(async (fbUser, fallbackToken = null) => {
    try {
      const token = fbUser ? await fbUser.getIdToken() : fallbackToken;
      if (token) setAuthToken(token);

      const { data } = await api.get("/auth/me");
      const resolved = {
        id: data.id || (fbUser ? fbUser.uid : null),
        email: data.email || (fbUser ? fbUser.email : null),
        name: data.name || (fbUser ? fbUser.displayName : null) || data.email?.split("@")[0] || "User",
        photoURL: fbUser?.photoURL || data.photo_url || null,
        provider: fbUser?.providerData?.[0]?.providerId || (data.auth_provider || "password"),
        preferences: data.preferences || { currency: "USD", timezone: "UTC" },
      };
      setUser(resolved);
      return resolved;
    } catch (_err) {
      if (fbUser) {
        const fallback = {
          id: fbUser.uid,
          email: fbUser.email,
          name: fbUser.displayName || fbUser.email?.split("@")[0] || "User",
          photoURL: fbUser.photoURL || null,
          provider: fbUser.providerData?.[0]?.providerId || "firebase",
          preferences: { currency: "USD", timezone: "UTC" },
        };
        setUser(fallback);
        return fallback;
      }
      setUser(false);
      return null;
    }
  }, []);

  useEffect(() => {
    let unsubscribe = null;

    if (auth && typeof onAuthStateChanged === "function") {
      unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          await syncBackendUser(fbUser);
          setReady(true);
        } else {
          // If no Firebase user, check if existing local/demo session is active
          try {
            const { data } = await api.get("/auth/me");
            setUser(data);
          } catch (_err) {
            setUser(false);
          } finally {
            setReady(true);
          }
        }
      });
    } else {
      // Fallback if Firebase auth is not configured or in unit tests
      (async () => {
        try {
          const { data } = await api.get("/auth/me");
          setUser(data);
        } catch (_err) {
          setUser(false);
        } finally {
          setReady(true);
        }
      })();
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [syncBackendUser]);

  const fallbackBackendLogin = async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      if (data.token) setAuthToken(data.token);
      setUser({ id: data.id, email: data.email, name: data.name });
      return { ok: true };
    } catch (e) {
      const errorMsg =
        e.response?.data?.error ||
        formatApiErrorDetail(e.response?.data?.detail) ||
        e.message;
      return { ok: false, error: errorMsg };
    }
  };

  const login = async (email, password) => {
    if (auth && isFirebaseConfigured) {
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        await syncBackendUser(cred.user);
        return { ok: true };
      } catch (fbErr) {
        // Allow demo account credentials to fall back to backend auth if desired
        if (email === "demo@lifeos.app") {
          const fallbackRes = await fallbackBackendLogin(email, password);
          if (fallbackRes.ok) return fallbackRes;
        }
        return { ok: false, error: formatFirebaseAuthError(fbErr) };
      }
    }
    return await fallbackBackendLogin(email, password);
  };

  const register = async (email, password, name) => {
    if (auth && isFirebaseConfigured) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name && cred.user) {
          try {
            await updateProfile(cred.user, { displayName: name });
          } catch (_err) {
            // Optional display name update failure is non-fatal
          }
        }
        const token = await cred.user.getIdToken();
        setAuthToken(token);
        try {
          await api.post("/auth/sync", { name });
        } catch (_err) {
          // Optional sync with backend is non-fatal
        }
        await syncBackendUser(cred.user);
        return { ok: true };
      } catch (fbErr) {
        return { ok: false, error: formatFirebaseAuthError(fbErr) };
      }
    }

    // Fallback registration via backend API
    try {
      const { data } = await api.post("/auth/register", { email, password, name });
      if (data.token) setAuthToken(data.token);
      setUser({ id: data.id, email: data.email, name: data.name });
      return { ok: true };
    } catch (e) {
      const errorMsg =
        e.response?.data?.error ||
        formatApiErrorDetail(e.response?.data?.detail) ||
        e.message;
      return { ok: false, error: errorMsg };
    }
  };

  const loginWithGoogle = async () => {
    if (!auth || !isFirebaseConfigured) {
      return {
        ok: false,
        error:
          "Firebase is not configured yet. Please configure REACT_APP_FIREBASE_API_KEY in frontend/.env to enable Google Sign-In.",
      };
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      setAuthToken(token);
      try {
        await api.post("/auth/sync", {
          name: result.user.displayName,
          photo_url: result.user.photoURL,
        });
      } catch (_err) {
        // Optional backend sync failure is non-fatal
      }
      await syncBackendUser(result.user);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: formatFirebaseAuthError(e) };
    }
  };

  const logout = async () => {
    if (auth && isFirebaseConfigured) {
      try {
        await signOut(auth);
      } catch (err) {
        console.warn("Firebase signout warning:", err);
      }
    }
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.warn("Backend logout warning:", err);
    }
    setAuthToken(null);
    setUser(false);
  };

  const resetPassword = async (email) => {
    if (!auth || !isFirebaseConfigured) {
      return {
        ok: false,
        error:
          "Firebase is not configured. Please supply REACT_APP_FIREBASE_API_KEY to send password reset emails.",
      };
    }
    try {
      await sendPasswordResetEmail(auth, email);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: formatFirebaseAuthError(e) };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        ready,
        login,
        register,
        loginWithGoogle,
        logout,
        resetPassword,
        isFirebaseConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
