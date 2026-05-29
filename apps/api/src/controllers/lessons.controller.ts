import { Request, Response } from "express";
import { prisma } from "../prisma";

export async function getLessonById(req: Request, res: Response) {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.params;
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: {
      module: {
        include: {
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
      },
      blocks: {
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  if (!lesson || !lesson.isPublished) {
    return res.status(404).json({ error: "Lesson not found" });
  }

  const progress = await prisma.userProgress.findUnique({
    where: {
      userId_lessonId: {
        userId,
        lessonId: lesson.id,
      },
    },
  });

  return res.json({ lesson, progress });
}

export async function startLesson(req: Request, res: Response) {
  const userId = req.user?.userId;
  const { id: lessonId } = req.params;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) {
    return res.status(404).json({ error: "Lesson not found" });
  }

  const progress = await prisma.userProgress.upsert({
    where: {
      userId_lessonId: { userId, lessonId },
    },
    create: {
      userId,
      lessonId,
      status: "IN_PROGRESS",
      attempts: 1,
    },
    update: {
      status: "IN_PROGRESS",
      attempts: { increment: 1 },
      lastAccessedAt: new Date(),
    },
  });

  return res.json({ progress });
}

export async function completeLesson(req: Request, res: Response) {
  const userId = req.user?.userId;
  const { id: lessonId } = req.params;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) {
    return res.status(404).json({ error: "Lesson not found" });
  }

  const existing = await prisma.userProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
  });

  const alreadyCompleted = existing?.status === "COMPLETED";

  const progress = await prisma.userProgress.upsert({
    where: {
      userId_lessonId: { userId, lessonId },
    },
    create: {
      userId,
      lessonId,
      status: "COMPLETED",
      completedAt: new Date(),
      score: 100,
      attempts: 1,
    },
    update: {
      status: "COMPLETED",
      completedAt: existing?.completedAt ?? new Date(),
      score: 100,
      lastAccessedAt: new Date(),
    },
  });

  if (!alreadyCompleted) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        xp: { increment: lesson.xpReward },
        lastActivityAt: new Date(),
      },
    });
  }

  return res.json({ progress, xpGained: alreadyCompleted ? 0 : lesson.xpReward });
}
