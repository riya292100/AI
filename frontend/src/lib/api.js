import axios from "axios";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

let authToken = null;
export const setAuthToken = (token) => {
  authToken = token;
  if (token) {
    localStorage.setItem("lifeos_token", token);
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    localStorage.removeItem("lifeos_token");
    delete api.defaults.headers.common["Authorization"];
  }
};

const stored = localStorage.getItem("lifeos_token");
if (stored) setAuthToken(stored);

export const formatApiErrorDetail = (detail) => {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
};

export default api;
