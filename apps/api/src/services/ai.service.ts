import { config } from "../config";

const SYSTEM_PROMPT = `
You are the AI tutor of AI-Mektep, a platform for school students preparing for Kazakhstan's UNT exam.

Rules:
1. Reply in the same language as the student: Russian or Kazakh.
2. Explain like a calm tutor for a confused school student.
3. Help with any UNT school subject on the platform: biology, geography, informatics, Kazakhstan history, math, physics, chemistry, reading literacy, and related school topics.
4. If lesson context is provided, use it first; if no lesson context is provided, answer as a general UNT tutor and ask one clarifying question only when needed.
5. If student code is provided, point to mistakes and guide with questions.
6. Do not give full ready-made solutions when the student should practice.
7. When the student asks for a hint, never reveal answer letters, final answers, or matching pairs; give a clue that helps them think.
8. If the student only greets you or asks a casual question, answer naturally and do not pick a random subject.
9. Use simple examples and short steps.
10. Keep replies concise: max 3 short paragraphs.
11. Format code in markdown blocks.
`;

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type GeminiContent = {
  role: "user" | "model";
  parts: Array<{ text: string }>;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

type LlmChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export type StudentMemorySnapshot = {
  summary?: string | null;
  weakTopics?: string[];
  strongTopics?: string[];
  facts?: string[];
};

function buildUserMessage(params: {
  message: string;
  lessonContext?: string;
  memory?: StudentMemorySnapshot | null;
  codeContext?: string;
  errorContext?: string;
}) {
  return [
    params.memory?.summary && `[Student memory summary: ${params.memory.summary}]`,
    params.memory?.weakTopics?.length && `[Weak topics: ${params.memory.weakTopics.join(", ")}]`,
    params.memory?.strongTopics?.length && `[Strong topics: ${params.memory.strongTopics.join(", ")}]`,
    params.memory?.facts?.length && `[Useful student facts: ${params.memory.facts.join("; ")}]`,
    params.lessonContext && `[Lesson context: ${params.lessonContext}]`,
    params.codeContext && `[Student code:\n\`\`\`python\n${params.codeContext}\n\`\`\`]`,
    params.errorContext && `[Error: ${params.errorContext}]`,
    params.message,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function toGeminiContents(messages: ChatMessage[]): GeminiContent[] {
  return messages
    .filter((item) => item.role !== "system")
    .map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.content }],
    }));
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getGeminiModels() {
  const fallbacks = config.GEMINI_FALLBACK_MODELS.split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  return Array.from(new Set([config.GEMINI_MODEL, ...fallbacks]));
}

function getGeminiEndpoint(model = config.GEMINI_MODEL) {
  const modelPath = model.startsWith("models/") ? model : `models/${model}`;
  return `${config.GEMINI_API_URL.replace(/\/$/, "")}/${modelPath}:generateContent`;
}

function isRetryableGeminiStatus(status: number) {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function getSystemInstruction(messages: ChatMessage[]) {
  return (
    messages
      .filter((item) => item.role === "system")
      .map((item) => item.content)
      .join("\n\n")
      .trim() || SYSTEM_PROMPT
  );
}

async function requestGeminiModel(messages: ChatMessage[], model: string) {
  const response = await fetch(getGeminiEndpoint(model), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": config.GEMINI_API_KEY || "",
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: getSystemInstruction(messages) }],
      },
      contents: toGeminiContents(messages),
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 1024,
      },
    }),
  });

  const data = (await response.json().catch(() => null)) as GeminiResponse | null;

  if (!response.ok) {
    throw new Error(`Gemini ${model} failed: ${response.status} ${data?.error?.message || response.statusText}`);
  }

  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
  if (!text) {
    throw new Error(`Gemini ${model} returned an empty response.`);
  }

  return text;
}

async function chatWithGemini(messages: ChatMessage[]) {
  if (!config.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set. Add it to apps/.env.");
  }

  let lastError: Error | null = null;

  for (const model of getGeminiModels()) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await requestGeminiModel(messages, model);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Gemini request failed.");
        const status = Number(lastError.message.match(/failed:\s+(\d+)/)?.[1]);
        if (!isRetryableGeminiStatus(status)) break;
        await delay(500 + attempt * 800);
      }
    }
  }

  throw new Error(
    lastError?.message.includes("503") || lastError?.message.includes("429")
      ? "Gemini сейчас перегружен. Попробуй ещё раз через несколько секунд."
      : lastError?.message || "Gemini request failed.",
  );
}

async function chatWithOpenAiCompatible(messages: ChatMessage[]) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.LLM_API_KEY) {
    headers.Authorization = `Bearer ${config.LLM_API_KEY}`;
  }

  const response = await fetch(config.LLM_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.LLM_MODEL,
      messages,
      max_tokens: 1024,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LLM request failed: ${response.status} ${body}`);
  }

  const data = (await response.json()) as LlmChatResponse;
  return data.choices?.[0]?.message?.content?.trim() || "";
}

export async function chat(params: {
  message: string;
  lessonContext?: string;
  memory?: StudentMemorySnapshot | null;
  conversationHistory?: { role: "user" | "assistant"; content: string }[];
  codeContext?: string;
  errorContext?: string;
}) {
  const userMessage = buildUserMessage(params);
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(params.conversationHistory || []).map((item) => ({
      role: item.role,
      content: item.content,
    })),
    { role: "user", content: userMessage },
  ];

  if (config.AI_PROVIDER === "openai-compatible") {
    return chatWithOpenAiCompatible(messages);
  }

  return chatWithGemini(messages);
}

function parseMemoryJson(raw: string): Required<StudentMemorySnapshot> {
  const fallback = {
    summary: "",
    weakTopics: [],
    strongTopics: [],
    facts: [],
  };

  try {
    const withoutFence = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
    const start = withoutFence.indexOf("{");
    const end = withoutFence.lastIndexOf("}");
    const normalized = start >= 0 && end >= start ? withoutFence.slice(start, end + 1) : withoutFence;
    const parsed = JSON.parse(normalized) as StudentMemorySnapshot;
    return {
      summary: String(parsed.summary || "").slice(0, 1200),
      weakTopics: Array.isArray(parsed.weakTopics) ? parsed.weakTopics.map(String).slice(0, 12) : [],
      strongTopics: Array.isArray(parsed.strongTopics) ? parsed.strongTopics.map(String).slice(0, 12) : [],
      facts: Array.isArray(parsed.facts) ? parsed.facts.map(String).slice(0, 12) : [],
    };
  } catch {
    return fallback;
  }
}

export async function summarizeStudentMemory(params: {
  currentMemory?: StudentMemorySnapshot | null;
  lessonContext?: string;
  userMessage: string;
  assistantReply: string;
}) {
  const prompt = `
Update the student's long-term tutoring memory.
Return only valid JSON with this exact shape:
{
  "summary": "short Russian summary of what the tutor should remember",
  "weakTopics": ["topic names the student struggles with"],
  "strongTopics": ["topic names the student understands"],
  "facts": ["stable useful facts about the student"]
}

Current memory:
${JSON.stringify(params.currentMemory || {}, null, 2)}

Lesson context:
${params.lessonContext || "No lesson context"}

Latest student message:
${params.userMessage}

Latest tutor reply:
${params.assistantReply}
`;

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: "You maintain compact memory for an educational tutor. Output only valid JSON. No markdown.",
    },
    { role: "user", content: prompt },
  ];

  const raw =
    config.AI_PROVIDER === "openai-compatible"
      ? await chatWithOpenAiCompatible(messages)
      : await chatWithGemini(messages);

  return parseMemoryJson(raw);
}
