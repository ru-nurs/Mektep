import dotenv from "dotenv";
import path from "node:path";
import { z } from "zod";

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "apps/.env"), override: false });
dotenv.config({ path: path.resolve(process.cwd(), "../.env"), override: false });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("1h"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("30d"),
  AI_PROVIDER: z.enum(["gemini", "openai-compatible"]).default("gemini"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_API_URL: z.string().url().default("https://generativelanguage.googleapis.com/v1beta"),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  GEMINI_FALLBACK_MODELS: z.string().default("gemini-2.0-flash-lite,gemini-2.0-flash,gemini-flash-lite-latest"),
  LLM_API_URL: z.string().url().default("http://127.0.0.1:11434/v1/chat/completions"),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default("llama3.1:8b"),
  PISTON_URL: z.string().url().default("http://localhost:2000"),
  GOOGLE_SERVICE_ACCOUNT_JSON: z.string().default("./service_account.json"),
  GOOGLE_DRIVE_FOLDER_ID: z.string().optional(),
  CORS_ORIGIN: z.string().default("http://localhost:5173,http://127.0.0.1:5173"),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
