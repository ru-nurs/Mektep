import { api } from "./client";

export async function sendAiMessage(payload: {
  message: string;
  lessonId?: string;
  sessionId?: string;
  conversationHistory?: { role: "user" | "assistant"; content: string }[];
  codeContext?: string;
  errorContext?: string;
}) {
  const { data } = await api.post<{ reply: string; sessionId?: string }>("/api/ai/chat", payload);
  return data;
}

export async function getAiMemory() {
  const { data } = await api.get<{
    memory: {
      summary?: string;
      weakTopics?: string[];
      strongTopics?: string[];
      facts?: string[];
    } | null;
  }>("/api/ai/memory");
  return data.memory;
}

export async function resetAiMemory() {
  await api.delete("/api/ai/memory");
}
