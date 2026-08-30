import { createContext, useContext, useEffect, useState } from "react";
import api, { setAuthToken, formatApiErrorDetail } from "../lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // null=loading, false=guest, obj=user
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/auth/me");
        setUser(data);
      } catch {
        setUser(false);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      if (data.token) setAuthToken(data.token);
      setUser({ id: data.id, email: data.email, name: data.name });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: formatApiErrorDetail(e.response?.data?.detail) || e.message };
    }
  };

  const register = async (email, password, name) => {
    try {
      const { data } = await api.post("/auth/register", { email, password, name });
      if (data.token) setAuthToken(data.token);
      setUser({ id: data.id, email: data.email, name: data.name });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: formatApiErrorDetail(e.response?.data?.detail) || e.message };
    }
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    setAuthToken(null);
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
