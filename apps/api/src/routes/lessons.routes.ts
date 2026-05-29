import { Router } from "express";
import { completeLesson, getLessonById, startLesson } from "../controllers/lessons.controller";
import { asyncHandler } from "../middleware/async.middleware";
import { authenticate } from "../middleware/auth.middleware";

export const lessonsRouter = Router();

lessonsRouter.get("/:id", authenticate, asyncHandler(getLessonById));
lessonsRouter.post("/:id/start", authenticate, asyncHandler(startLesson));
lessonsRouter.post("/:id/complete", authenticate, asyncHandler(completeLesson));
