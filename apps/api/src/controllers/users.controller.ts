import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma";

const profileSchema = z.object({
  fullName: z.string().min(2).optional(),
  avatarUrl: z.string().url().optional(),
});

export async function meStats(req: Request, res: Response) {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const completedLessons = await prisma.userProgress.count({
    where: { userId, status: "COMPLETED" },
  });

  const higherXpUsers = await prisma.user.count({
    where: { xp: { gt: user.xp } },
  });

  return res.json({
    xp: user.xp,
    streak: user.streakDays,
    completedLessons,
    rank: higherXpUsers + 1,
  });
}

export async function meAchievements(req: Request, res: Response) {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const achievements = await prisma.userAchievement.findMany({
    where: { userId },
    include: { achievement: true },
    orderBy: { earnedAt: "desc" },
  });

  return res.json({ achievements });
}

export async function updateProfile(req: Request, res: Response) {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: parsed.data,
  });

  const { passwordHash, ...safeUser } = user;
  return res.json({ user: safeUser });
}

export async function leaderboard(req: Request, res: Response) {
  const period = String(req.query.period || "all_time");
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);

  const users = await prisma.user.findMany({
    where:
      period === "weekly"
        ? {
            lastActivityAt: {
              gte: weekAgo,
            },
          }
        : undefined,
    select: {
      id: true,
      username: true,
      fullName: true,
      avatarUrl: true,
      xp: true,
      streakDays: true,
    },
    orderBy: [{ xp: "desc" }, { streakDays: "desc" }],
    take: 100,
  });

  return res.json({ leaderboard: users, period });
}
