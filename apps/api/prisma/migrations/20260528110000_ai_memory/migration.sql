CREATE TABLE IF NOT EXISTS "ai_chat_sessions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "lesson_id" TEXT,
  "title" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ai_chat_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ai_chat_sessions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ai_chat_sessions_user_updated_idx"
ON "ai_chat_sessions"("user_id", "updated_at" DESC);

CREATE TABLE IF NOT EXISTS "ai_chat_messages" (
  "id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ai_chat_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_chat_messages_role_check" CHECK ("role" IN ('user', 'assistant')),
  CONSTRAINT "ai_chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "ai_chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ai_chat_messages_session_created_idx"
ON "ai_chat_messages"("session_id", "created_at" ASC);

CREATE TABLE IF NOT EXISTS "ai_student_memories" (
  "user_id" TEXT NOT NULL,
  "summary" TEXT NOT NULL DEFAULT '',
  "facts" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "weak_topics" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "strong_topics" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "last_updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ai_student_memories_pkey" PRIMARY KEY ("user_id"),
  CONSTRAINT "ai_student_memories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
