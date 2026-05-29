import Editor from "@monaco-editor/react";
import { Play, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { api } from "../../api/client";

export default function CodeBlock({
  lessonId,
  starterCode,
  language = "python",
}: {
  lessonId: string;
  starterCode: string;
  language?: "python" | "javascript" | "cpp";
}) {
  const [code, setCode] = useState(starterCode);
  const [output, setOutput] = useState("");
  const [checking, setChecking] = useState(false);

  async function runCode() {
    const { data } = await api.post("/api/code/run", { language, code });
    setOutput([data.stdout, data.stderr].filter(Boolean).join("\n"));
  }

  async function checkCode() {
    setChecking(true);
    try {
      const { data } = await api.post("/api/code/check", { lessonId, language, code });
      setOutput(JSON.stringify(data, null, 2));
    } finally {
      setChecking(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button onClick={runCode} className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
          <Play size={16} />
          Запустить
        </button>
        <button
          onClick={checkCode}
          disabled={checking}
          className="inline-flex items-center gap-2 rounded-md border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
        >
          <ShieldCheck size={16} />
          Проверить
        </button>
      </div>

      <Editor
        height="320px"
        defaultLanguage={language}
        value={code}
        onChange={(value) => setCode(value || "")}
        options={{ fontSize: 14, minimap: { enabled: false } }}
      />

      <pre className="mt-3 overflow-auto rounded-md bg-slate-950 p-3 font-mono text-xs text-slate-50">{output || "Output..."}</pre>
    </section>
  );
}
