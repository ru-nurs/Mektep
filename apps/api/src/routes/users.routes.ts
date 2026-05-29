import { Router } from "express";
import { leaderboard, meAchievements, meStats, updateProfile } from "../controllers/users.controller";
import { asyncHandler } from "../middleware/async.middleware";
import { authenticate } from "../middleware/auth.middleware";

export const usersRouter = Router();

usersRouter.get("/me/stats", authenticate, asyncHandler(meStats));
usersRouter.get("/me/achievements", authenticate, asyncHandler(meAchievements));
usersRouter.patch("/me/profile", authenticate, asyncHandler(updateProfile));
usersRouter.get("/leaderboard", asyncHandler(leaderboard));
