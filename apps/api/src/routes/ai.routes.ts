import { Router } from "express";
import { aiChat, getAiMemory, resetAiMemory } from "../controllers/ai.controller";
import { authenticate } from "../middleware/auth.middleware";

export const aiRouter = Router();

aiRouter.post("/chat", authenticate, aiChat);
aiRouter.get("/memory", authenticate, getAiMemory);
aiRouter.delete("/memory", authenticate, resetAiMemory);
