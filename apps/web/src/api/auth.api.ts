import { api } from "./client";
import { User } from "../types";

export async function register(payload: {
  email: string;
  username: string;
  password: string;
  fullName?: string;
}) {
  const { data } = await api.post<{ accessToken: string; user: User }>("/api/auth/register", payload);
  return data;
}

export async function login(payload: { email: string; password: string }) {
  const { data } = await api.post<{ accessToken: string; user: User }>("/api/auth/login", payload);
  return data;
}

export async function getMe() {
  const { data } = await api.get<{ user: User }>("/api/auth/me");
  return data.user;
}

export async function logout() {
  await api.post("/api/auth/logout");
}
