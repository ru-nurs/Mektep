import express from "express";
import path from "node:path";

export const booksRouter = express.Router();

const BOOKS_ROOT = path.resolve(process.cwd(), "../../books");

booksRouter.get("/file", (req, res) => {
  const requestedPath = String(req.query.path || "");
  if (!requestedPath) {
    return res.status(400).json({ error: "Missing file path" });
  }

  const absolutePath = path.resolve(BOOKS_ROOT, requestedPath);
  const relative = path.relative(BOOKS_ROOT, absolutePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return res.status(400).json({ error: "Invalid file path" });
  }

  return res.sendFile(absolutePath, (error) => {
    if (error && !res.headersSent) {
      res.status(404).json({ error: "File not found" });
    }
  });
});
