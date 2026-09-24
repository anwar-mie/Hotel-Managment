import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
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

// Seamless token refresh mechanism on 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

function redirectToLogin() {
  if (typeof window !== "undefined") {
    const isLogin =
      window.location.pathname === "/login" ||
      window.location.pathname.startsWith("/login");
    if (!isLogin) {
      console.warn("Session expired - redirecting to /login.");
      localStorage.removeItem("aura_tokens");
      localStorage.removeItem("aura_user");
      document.cookie =
        "aura_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
      window.location.href = "/login";
    }
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    // If 401 Unauthorized and not an auth call
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      typeof window !== "undefined"
    ) {
      if (
        originalRequest.url?.includes("/auth/login") ||
        originalRequest.url?.includes("/auth/refresh")
      ) {
        return Promise.reject(error);
      }

      const tokensStr = localStorage.getItem("aura_tokens");
      if (!tokensStr) {
        redirectToLogin();
        return Promise.reject(error);
      }

      let parsedTokens: any;
      try {
        parsedTokens = JSON.parse(tokensStr);
      } catch {
        redirectToLogin();
        return Promise.reject(error);
      }

      if (!parsedTokens?.refreshToken) {
        redirectToLogin();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {
            refreshToken: parsedTokens.refreshToken,
          }
        );

        const newTokens = refreshResponse.data;
        localStorage.setItem("aura_tokens", JSON.stringify(newTokens));
        document.cookie = `aura_token=${encodeURIComponent(
          newTokens.accessToken
        )}; path=/; max-age=2592000; SameSite=Lax`;

        api.defaults.headers.common.Authorization = `Bearer ${newTokens.accessToken}`;
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
        }

        processQueue(null, newTokens.accessToken);
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        redirectToLogin();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
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
