import { Router } from "express";
import { login, logout, me, refresh, register } from "../controllers/auth.controller";
import { asyncHandler } from "../middleware/async.middleware";
import { authenticate } from "../middleware/auth.middleware";

export const authRouter = Router();

authRouter.post("/register", asyncHandler(register));
authRouter.post("/login", asyncHandler(login));
authRouter.post("/logout", logout);
authRouter.post("/refresh", asyncHandler(refresh));
authRouter.get("/me", authenticate, asyncHandler(me));
