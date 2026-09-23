import axios, { AxiosError, AxiosInstance } from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Attach JWT access token to requests automatically
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const tokensStr = localStorage.getItem("aura_tokens");
      if (tokensStr) {
        try {
          const tokens = JSON.parse(tokensStr);
          if (tokens.accessToken) {
            config.headers.Authorization = `Bearer ${tokens.accessToken}`;
          }
        } catch {
          // ignore corrupted localstorage
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept 401s and format errors cleanly
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const isLogin = window.location.pathname === "/login";
      if (!isLogin && !window.location.pathname.startsWith("/login")) {
        console.warn("Session expired or unauthorized - redirecting to /login.");
        localStorage.removeItem("aura_tokens");
        localStorage.removeItem("aura_user");
        document.cookie = "aura_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as any;
    if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      return data.errors
        .map((e: any) => (e.field ? `${e.field}: ${e.message}` : e.message))
        .join(", ");
    }
    if (data?.message) {
      if (Array.isArray(data.message)) {
        return data.message.join(", ");
      }
      return String(data.message);
    }
    if (data?.error) {
      return String(data.error);
    }
    return error.message || "An unexpected error occurred.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred.";
}

export default api;
