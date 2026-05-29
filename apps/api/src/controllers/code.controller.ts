import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { checkCode, runCode } from "../services/code.service";

const runSchema = z.object({
  language: z.enum(["python", "javascript", "cpp"]),
  code: z.string().min(1),
  stdin: z.string().optional(),
});

const checkSchema = z.object({
  lessonId: z.string().min(1),
  language: z.enum(["python", "javascript", "cpp"]).default("python"),
  code: z.string().min(1),
});

export async function run(req: Request, res: Response) {
  const parsed = runSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }

  const result = await runCode(parsed.data.language, parsed.data.code, parsed.data.stdin || "");
  return res.json(result);
}

export async function check(req: Request, res: Response) {
  const parsed = checkSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: parsed.data.lessonId },
    include: { blocks: true },
  });

  if (!lesson) {
    return res.status(404).json({ error: "Lesson not found" });
  }

  const codeBlock = lesson.blocks.find((block) => block.blockType === "code");
  const content = codeBlock?.content as
    | { tests?: { stdin?: string; expectedOutput: string }[] }
    | undefined;

  const tests = content?.tests ?? [];
  if (!tests.length) {
    return res.status(400).json({ error: "No tests found for this lesson" });
  }

  const result = await checkCode(parsed.data.language, parsed.data.code, tests);
  return res.json(result);
}
