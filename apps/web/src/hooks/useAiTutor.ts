import { useEffect, useState } from "react";
import { sendAiMessage } from "../api/ai.api";

export function useAiTutor(lessonId?: string) {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMessages([]);
    setSessionId(undefined);
  }, [lessonId]);

  async function ask(message: string, codeContext?: string, errorContext?: string) {
    setLoading(true);
    const nextHistory = [...messages, { role: "user" as const, content: message }];
    setMessages(nextHistory);

    try {
      const reply = await sendAiMessage({
        message,
        lessonId,
        sessionId,
        conversationHistory: messages,
        codeContext,
        errorContext,
      });

      setSessionId(reply.sessionId);
      setMessages((prev) => [...prev, { role: "assistant", content: reply.reply }]);
    } catch (err) {
      const responseError =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { error?: unknown } } }).response?.data?.error
          : undefined;
      const fallback =
        typeof responseError === "string"
          ? responseError
          : err instanceof Error
            ? err.message
            : "Не удалось получить ответ AI. Попробуй ещё раз.";
      setMessages((prev) => [...prev, { role: "assistant", content: fallback }]);
    } finally {
      setLoading(false);
    }
  }

  return { messages, loading, ask };
}
