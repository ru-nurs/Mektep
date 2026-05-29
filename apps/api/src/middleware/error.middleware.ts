import { NextFunction, Request, Response } from "express";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error(err);
  const message = err instanceof Error ? err.message : "Internal server error";
  const isDatabaseUnavailable =
    message.includes("Can't reach database server") ||
    message.includes("Timed out fetching a new connection") ||
    message.includes("P1001");

  res.status(isDatabaseUnavailable ? 503 : 500).json({
    error: isDatabaseUnavailable
      ? "Database is unavailable. Start PostgreSQL on localhost:5432 and run migrations."
      : message,
  });
}
