import { useEffect, useState } from "react";
import { getMe, login, logout, register } from "../api/auth.api";
import { useAuthStore } from "../store/authStore";

export function useAuth() {
  const { user, isAuthenticated, setSession, clearSession } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    getMe()
      .then((me) => {
        const token = useAuthStore.getState().accessToken;
        if (token) setSession(token, me);
      })
      .catch(() => {
        clearSession();
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, setSession, clearSession]);

  return {
    user,
    isAuthenticated,
    loading,
    async signIn(email: string, password: string) {
      const data = await login({ email, password });
      setSession(data.accessToken, data.user);
    },
    async signUp(payload: { email: string; username: string; password: string; fullName?: string }) {
      const data = await register(payload);
      setSession(data.accessToken, data.user);
    },
    async signOut() {
      await logout().catch(() => undefined);
      clearSession();
    },
  };
}
