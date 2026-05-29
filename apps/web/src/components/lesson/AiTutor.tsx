import { Send } from "lucide-react";
import { FormEvent, useState } from "react";
import { useAiTutor } from "../../hooks/useAiTutor";

export default function AiTutor({ lessonId }: { lessonId?: string }) {
  const { messages, loading, ask } = useAiTutor(lessonId);
  const [input, setInput] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const question = input;
    setInput("");
    await ask(question);
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex-1 space-y-3 overflow-auto p-4">
        {messages.length === 0 && (
          <div className="rounded-lg border border-dashed border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
            Напиши, что непонятно. Я объясню короче и проще.
          </div>
        )}

        {messages.map((item, idx) => (
          <div key={`${item.role}-${idx}`} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2 text-sm leading-6 ${
                item.role === "user" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-800"
              }`}
            >
              {item.content}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={onSubmit} className="border-t border-emerald-100 p-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Задай вопрос"
            className="min-h-[60px] flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-300"
          />
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            <Send size={16} />
            {loading ? "..." : "Отправить"}
          </button>
        </div>
      </form>
    </div>
  );
}
