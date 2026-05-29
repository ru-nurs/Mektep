import { Request, Response } from "express";
import { z } from "zod";
import { Difficulty } from "@prisma/client";
import { prisma } from "../prisma";

const querySchema = z.object({
  category: z.string().optional(),
  difficulty: z.nativeEnum(Difficulty).optional(),
});

export async function listCourses(req: Request, res: Response) {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }

  const courses = await prisma.course.findMany({
    where: {
      isPublished: true,
      category: parsed.data.category,
      difficulty: parsed.data.difficulty,
    },
    orderBy: [{ orderIndex: "asc" }, { createdAt: "desc" }],
  });

  return res.json({ courses });
}

export async function getCourseBySlug(req: Request, res: Response) {
  const { slug } = req.params;
  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      modules: {
        orderBy: { orderIndex: "asc" },
        include: {
          lessons: {
            where: { isPublished: true },
            orderBy: { orderIndex: "asc" },
          },
        },
      },
    },
  });

  if (!course || !course.isPublished) {
    return res.status(404).json({ error: "Course not found" });
  }

  return res.json({ course });
}

export async function getCourseProgress(req: Request, res: Response) {
  const userId = req.user?.userId;
  const { slug } = req.params;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      modules: {
        include: {
          lessons: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!course) {
    return res.status(404).json({ error: "Course not found" });
  }

  const lessonIds = course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));
  const progress = await prisma.userProgress.findMany({
    where: {
      userId,
      lessonId: { in: lessonIds },
    },
  });

  const completedLessons = progress.filter((item) => item.status === "COMPLETED").length;

  return res.json({
    totalLessons: lessonIds.length,
    completedLessons,
    progress,
  });
}
