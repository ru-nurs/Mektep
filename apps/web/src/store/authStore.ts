import { create } from "zustand";
import { User } from "../types";

type AuthState = {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setSession: (token: string, user: User) => void;
  clearSession: () => void;
};

const TOKEN_KEY = "ai_mektep_token";
const USER_KEY = "ai_mektep_user";

function loadUserFromStorage(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: localStorage.getItem(TOKEN_KEY),
  user: loadUserFromStorage(),
  isAuthenticated: Boolean(localStorage.getItem(TOKEN_KEY)),
  setSession: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ accessToken: token, user, isAuthenticated: true });
  },
  clearSession: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ accessToken: null, user: null, isAuthenticated: false });
  },
}));
