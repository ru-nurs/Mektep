import axios from "axios";
import { useAuthStore } from "../store/authStore";
import { getApiBaseUrl } from "./baseUrl";

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

let isRefreshing = false;
let pendingQueue: Array<() => void> = [];

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve) => {
        pendingQueue.push(() => resolve(api(originalRequest)));
      });
    }

    isRefreshing = true;
    originalRequest._retry = true;

    try {
      const { data } = await api.post("/api/auth/refresh");
      useAuthStore.getState().setSession(data.accessToken, data.user);
      pendingQueue.forEach((retry) => retry());
      pendingQueue = [];
      return api(originalRequest);
    } catch (refreshError) {
      useAuthStore.getState().clearSession();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
