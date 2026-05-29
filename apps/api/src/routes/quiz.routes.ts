import { Router } from "express";
import { checkQuizAnswer, getQuizQuestions, submitQuiz } from "../controllers/quiz.controller";
import { asyncHandler } from "../middleware/async.middleware";
import { authenticate } from "../middleware/auth.middleware";

export const quizRouter = Router();

quizRouter.get("/:lessonId/questions", authenticate, asyncHandler(getQuizQuestions));
quizRouter.post("/:lessonId/check", authenticate, asyncHandler(checkQuizAnswer));
quizRouter.post("/:lessonId/submit", authenticate, asyncHandler(submitQuiz));
