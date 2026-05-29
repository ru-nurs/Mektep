import { randomUUID } from "node:crypto";
import { prisma } from "../prisma";
import type { StudentMemorySnapshot } from "./ai.service";

type SessionRow = {
  id: string;
  user_id: string;
  lesson_id: string | null;
};

type MessageRow = {
  role: "user" | "assistant";
  content: string;
};

type MemoryRow = {
  user_id: string;
  summary: string;
  facts: unknown;
  weak_topics: unknown;
  strong_topics: unknown;
  last_updated_at: Date;
};

let schemaReady: Promise<void> | null = null;

export function ensureAiMemorySchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS ai_chat_sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
          title TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS ai_chat_sessions_user_updated_idx
        ON ai_chat_sessions(user_id, updated_at DESC)
      `;

      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS ai_chat_messages (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
          role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
          content TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS ai_chat_messages_session_created_idx
        ON ai_chat_messages(session_id, created_at ASC)
      `;

      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS ai_student_memories (
          user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          summary TEXT NOT NULL DEFAULT '',
          facts JSONB NOT NULL DEFAULT '[]'::jsonb,
          weak_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
          strong_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
          last_updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `;
    })();
  }

  return schemaReady;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

export async function getStudentMemory(userId: string): Promise<StudentMemorySnapshot | null> {
  await ensureAiMemorySchema();

  const rows = await prisma.$queryRaw<MemoryRow[]>`
    SELECT user_id, summary, facts, weak_topics, strong_topics, last_updated_at
    FROM ai_student_memories
    WHERE user_id = ${userId}
    LIMIT 1
  `;

  const memory = rows[0];
  if (!memory) return null;

  return {
    summary: memory.summary,
    facts: asStringArray(memory.facts),
    weakTopics: asStringArray(memory.weak_topics),
    strongTopics: asStringArray(memory.strong_topics),
  };
}

export async function upsertStudentMemory(userId: string, memory: Required<StudentMemorySnapshot>) {
  await ensureAiMemorySchema();

  await prisma.$executeRaw`
    INSERT INTO ai_student_memories (user_id, summary, facts, weak_topics, strong_topics, last_updated_at)
    VALUES (
      ${userId},
      ${memory.summary || ""},
      CAST(${JSON.stringify(memory.facts || [])} AS JSONB),
      CAST(${JSON.stringify(memory.weakTopics || [])} AS JSONB),
      CAST(${JSON.stringify(memory.strongTopics || [])} AS JSONB),
      CURRENT_TIMESTAMP
    )
    ON CONFLICT (user_id) DO UPDATE SET
      summary = EXCLUDED.summary,
      facts = EXCLUDED.facts,
      weak_topics = EXCLUDED.weak_topics,
      strong_topics = EXCLUDED.strong_topics,
      last_updated_at = CURRENT_TIMESTAMP
  `;
}

export async function resetStudentAiMemory(userId: string) {
  await ensureAiMemorySchema();

  await prisma.$executeRaw`
    DELETE FROM ai_chat_sessions
    WHERE user_id = ${userId}
  `;

  await prisma.$executeRaw`
    DELETE FROM ai_student_memories
    WHERE user_id = ${userId}
  `;
}

export async function getOrCreateAiSession(params: {
  userId: string;
  lessonId?: string;
  sessionId?: string;
}) {
  await ensureAiMemorySchema();

  if (params.sessionId) {
    const rows = await prisma.$queryRaw<SessionRow[]>`
      SELECT id, user_id, lesson_id
      FROM ai_chat_sessions
      WHERE id = ${params.sessionId} AND user_id = ${params.userId}
      LIMIT 1
    `;

    if (rows[0]) return rows[0];
  }

  const recentRows = params.lessonId
    ? await prisma.$queryRaw<SessionRow[]>`
        SELECT id, user_id, lesson_id
        FROM ai_chat_sessions
        WHERE user_id = ${params.userId} AND lesson_id = ${params.lessonId}
        ORDER BY updated_at DESC
        LIMIT 1
      `
    : await prisma.$queryRaw<SessionRow[]>`
        SELECT id, user_id, lesson_id
        FROM ai_chat_sessions
        WHERE user_id = ${params.userId} AND lesson_id IS NULL
        ORDER BY updated_at DESC
        LIMIT 1
      `;

  if (recentRows[0]) return recentRows[0];

  const id = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO ai_chat_sessions (id, user_id, lesson_id, title)
    VALUES (${id}, ${params.userId}, ${params.lessonId || null}, ${params.lessonId ? "Lesson chat" : "General chat"})
  `;

  return {
    id,
    user_id: params.userId,
    lesson_id: params.lessonId || null,
  };
}

export async function getRecentAiMessages(sessionId: string, limit = 12) {
  await ensureAiMemorySchema();

  const rows = await prisma.$queryRaw<MessageRow[]>`
    SELECT role, content
    FROM (
      SELECT role, content, created_at
      FROM ai_chat_messages
      WHERE session_id = ${sessionId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    ) recent
    ORDER BY created_at ASC
  `;

  return rows;
}

export async function saveAiMessage(params: {
  sessionId: string;
  role: "user" | "assistant";
  content: string;
}) {
  await ensureAiMemorySchema();

  await prisma.$executeRaw`
    INSERT INTO ai_chat_messages (id, session_id, role, content)
    VALUES (${randomUUID()}, ${params.sessionId}, ${params.role}, ${params.content})
  `;

  await prisma.$executeRaw`
    UPDATE ai_chat_sessions
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = ${params.sessionId}
  `;
}
