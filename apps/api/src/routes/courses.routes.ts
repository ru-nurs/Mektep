import { Router } from "express";
import { getCourseBySlug, getCourseProgress, listCourses } from "../controllers/courses.controller";
import { asyncHandler } from "../middleware/async.middleware";
import { authenticate } from "../middleware/auth.middleware";

export const coursesRouter = Router();

coursesRouter.get("/", asyncHandler(listCourses));
coursesRouter.get("/:slug", asyncHandler(getCourseBySlug));
coursesRouter.get("/:slug/progress", authenticate, asyncHandler(getCourseProgress));
