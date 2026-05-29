import { config } from "../config";

const PISTON_URL = config.PISTON_URL;

const LANGUAGE_MAP: Record<string, { language: string; version: string }> = {
  python: { language: "python", version: "3.10.0" },
  javascript: { language: "javascript", version: "18.15.0" },
  cpp: { language: "c++", version: "10.2.0" },
};

type PistonRunResponse = {
  run?: {
    stdout?: string;
    stderr?: string;
    code?: number;
  };
};

export async function runCode(language: string, code: string, stdin = "") {
  const lang = LANGUAGE_MAP[language];
  if (!lang) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const res = await fetch(`${PISTON_URL}/api/v2/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: lang.language,
      version: lang.version,
      files: [{ content: code }],
      stdin,
      run_timeout: 5000,
      compile_timeout: 10000,
    }),
  });

  if (!res.ok) {
    throw new Error(`Piston request failed: ${res.status}`);
  }

  const data = (await res.json()) as PistonRunResponse;
  return {
    stdout: data.run?.stdout || "",
    stderr: data.run?.stderr || "",
    exitCode: data.run?.code ?? 0,
  };
}

export async function checkCode(
  language: string,
  code: string,
  tests: { stdin?: string; expectedOutput: string }[],
) {
  const results = [] as Array<{ passed: boolean; expected: string; actual: string; stderr: string }>;

  for (const test of tests) {
    const output = await runCode(language, code, test.stdin || "");
    const actual = (output.stdout || "").trim();
    const expected = (test.expectedOutput || "").trim();
    const passed = actual === expected && !output.stderr;

    results.push({
      passed,
      expected,
      actual,
      stderr: output.stderr,
    });
  }

  return {
    passed: results.every((item) => item.passed),
    results,
  };
}
