import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "@prisma/client";
import { config } from "../config";
import { prisma } from "../prisma";

const REFRESH_COOKIE_NAME = "refreshToken";
const SALT_ROUNDS = 10;

function signAccessToken(user: User) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] },
  );
}

function signRefreshToken(user: User) {
  return jwt.sign(
    { userId: user.id },
    config.JWT_SECRET,
    { expiresIn: config.REFRESH_TOKEN_EXPIRES_IN as jwt.SignOptions["expiresIn"] },
  );
}

export async function registerUser(input: {
  email: string;
  username: string;
  fullName?: string;
  password: string;
}) {
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      username: input.username,
      fullName: input.fullName,
      passwordHash,
    },
  });

  return {
    user,
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  };
}

export async function loginUser(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
  if (!isValidPassword) {
    throw new Error("Invalid credentials");
  }

  return {
    user,
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const payload = jwt.verify(refreshToken, config.JWT_SECRET) as { userId: string };
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });

  if (!user) {
    throw new Error("User not found");
  }

  return {
    user,
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  };
}

export function toSafeUser(user: User) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export const authConstants = {
  REFRESH_COOKIE_NAME,
};
