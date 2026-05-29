import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { chat, summarizeStudentMemory } from "../services/ai.service";
import {
  getOrCreateAiSession,
  getRecentAiMessages,
  getStudentMemory,
  resetStudentAiMemory,
  saveAiMessage,
  upsertStudentMemory,
} from "../services/ai-memory.service";

const schema = z.object({
  message: z.string().min(1),
  lessonId: z.string().optional(),
  sessionId: z.string().optional(),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .optional(),
  codeContext: z.string().optional(),
  errorContext: z.string().optional(),
});

function blockToText(block: { blockType: string; content: unknown }) {
  if (!block.content || typeof block.content !== "object") return "";
  const content = block.content as Record<string, unknown>;

  if (block.blockType === "text") return String(content.markdown || "");
  if (block.blockType === "hint") return String(content.text || "");
  if (block.blockType === "code") return String(content.starterCode || "");
  if (block.blockType === "source_pdf") {
    const sources = Array.isArray(content.sources) ? content.sources : [];
    return sources
      .map((source) => {
        if (!source || typeof source !== "object") return "";
        const item = source as Record<string, unknown>;
        return `Источник: ${String(item.label || item.path || "").trim()}`;
      })
      .filter(Boolean)
      .join("\n");
  }

  return "";
}

async function getPlatformContext() {
  const courses = await prisma.course.findMany({
    where: { isPublished: true },
    orderBy: { orderIndex: "asc" },
    select: {
      title: true,
      modules: {
        orderBy: { orderIndex: "asc" },
        select: { title: true },
      },
    },
  });

  return courses
    .map((course) => {
      const topics = course.modules
        .slice(0, 18)
        .map((module) => module.title)
        .join("; ");
      return `${course.title}: ${topics}`;
    })
    .join("\n")
    .slice(0, 2600);
}

export async function aiChat(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }

    const platformContext = await getPlatformContext();
    let lessonContext: string | undefined;
    if (parsed.data.lessonId) {
      const lesson = await prisma.lesson.findUnique({
        where: { id: parsed.data.lessonId },
        include: {
          module: { include: { course: true } },
          blocks: { orderBy: { orderIndex: "asc" }, take: 3 },
        },
      });

      if (lesson) {
        const snippets = lesson.blocks
          .map(blockToText)
          .map((item) => item.replace(/\s+/g, " ").trim())
          .filter(Boolean)
          .join("\n")
          .slice(0, 1800);

        lessonContext = [
          platformContext && `Platform courses and topics:\n${platformContext}`,
          `${lesson.module.course.title} > ${lesson.module.title} > ${lesson.title}`,
          snippets && `Lesson snippet: ${snippets}`,
        ]
          .filter(Boolean)
          .join("\n");
      }
    }

    if (!lessonContext && platformContext) {
      lessonContext = `Platform courses and topics:\n${platformContext}`;
    }

    const session = await getOrCreateAiSession({
      userId,
      lessonId: parsed.data.lessonId,
      sessionId: parsed.data.sessionId,
    });

    const serverHistory = await getRecentAiMessages(session.id);
    const memory = await getStudentMemory(userId);
    const conversationHistory = serverHistory.length ? serverHistory : parsed.data.conversationHistory || [];

    await saveAiMessage({
      sessionId: session.id,
      role: "user",
      content: parsed.data.message,
    });

    const reply = await chat({
      message: parsed.data.message,
      lessonContext,
      memory,
      conversationHistory,
      codeContext: parsed.data.codeContext,
      errorContext: parsed.data.errorContext,
    });

    await saveAiMessage({
      sessionId: session.id,
      role: "assistant",
      content: reply,
    });

    try {
      const updatedMemory = await summarizeStudentMemory({
        currentMemory: memory,
        lessonContext,
        userMessage: parsed.data.message,
        assistantReply: reply,
      });
      await upsertStudentMemory(userId, updatedMemory);
    } catch (error) {
      console.warn("AI memory update failed", error);
    }

    return res.json({ reply, sessionId: session.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return res.status(502).json({ error: message });
  }
}

export async function getAiMemory(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const memory = await getStudentMemory(userId);
    return res.json({ memory });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI memory request failed";
    return res.status(500).json({ error: message });
  }
}

export async function resetAiMemory(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await resetStudentAiMemory(userId);
    return res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI memory reset failed";
    return res.status(500).json({ error: message });
  }
}
