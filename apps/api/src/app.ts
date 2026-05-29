import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { config } from "./config";
import { aiRouter } from "./routes/ai.routes";
import { authRouter } from "./routes/auth.routes";
import { booksRouter } from "./routes/books.routes";
import { codeRouter } from "./routes/code.routes";
import { coursesRouter } from "./routes/courses.routes";
import { lessonsRouter } from "./routes/lessons.routes";
import { quizRouter } from "./routes/quiz.routes";
import { usersRouter } from "./routes/users.routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";

export const app = express();
const allowedOrigins = config.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const isDev = config.NODE_ENV !== "production";
const vercelAppOriginPattern = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;

function isAllowedProductionOrigin(origin?: string) {
  if (!origin) {
    return true;
  }

  return allowedOrigins.includes(origin) || vercelAppOriginPattern.test(origin);
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // In development allow any LAN/localhost origin to avoid preflight failures.
    if (isDev) {
      callback(null, true);
      return;
    }

    if (isAllowedProductionOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ai-mektep-api" });
});

app.use("/api/auth", authRouter);
app.use("/api/books", booksRouter);
app.use("/api/courses", coursesRouter);
app.use("/api/lessons", lessonsRouter);
app.use("/api/quiz", quizRouter);
app.use("/api/code", codeRouter);
app.use("/api/ai", aiRouter);
app.use("/api/users", usersRouter);

app.use(notFoundHandler);
app.use(errorHandler);
