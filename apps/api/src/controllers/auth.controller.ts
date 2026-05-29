import { Request, Response } from "express";
import { z } from "zod";
import { config } from "../config";
import {
  authConstants,
  loginUser,
  refreshAccessToken,
  registerUser,
  toSafeUser,
} from "../services/auth.service";
import { prisma } from "../prisma";

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(6),
  fullName: z.string().min(2).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: config.NODE_ENV === "production",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: parsed.data.email }, { username: parsed.data.username }],
    },
  });

  if (existing) {
    return res.status(409).json({ error: "Email or username already exists" });
  }

  const { user, accessToken, refreshToken } = await registerUser(parsed.data);
  res.cookie(authConstants.REFRESH_COOKIE_NAME, refreshToken, cookieOptions);

  return res.status(201).json({ accessToken, user: toSafeUser(user) });
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }

  try {
    const { user, accessToken, refreshToken } = await loginUser(parsed.data);
    res.cookie(authConstants.REFRESH_COOKIE_NAME, refreshToken, cookieOptions);
    return res.json({ accessToken, user: toSafeUser(user) });
  } catch {
    return res.status(401).json({ error: "Invalid credentials" });
  }
}

export async function refresh(req: Request, res: Response) {
  const refreshToken = req.cookies?.[authConstants.REFRESH_COOKIE_NAME];
  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token missing" });
  }

  try {
    const { user, accessToken, refreshToken: nextRefreshToken } = await refreshAccessToken(refreshToken);
    res.cookie(authConstants.REFRESH_COOKIE_NAME, nextRefreshToken, cookieOptions);
    return res.json({ accessToken, user: toSafeUser(user) });
  } catch {
    res.clearCookie(authConstants.REFRESH_COOKIE_NAME);
    return res.status(401).json({ error: "Invalid refresh token" });
  }
}

export function logout(_req: Request, res: Response) {
  res.clearCookie(authConstants.REFRESH_COOKIE_NAME);
  return res.status(204).send();
}

export async function me(req: Request, res: Response) {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.json({ user: toSafeUser(user) });
}
