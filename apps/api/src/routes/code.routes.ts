import { Router } from "express";
import { check, run } from "../controllers/code.controller";
import { asyncHandler } from "../middleware/async.middleware";

export const codeRouter = Router();

codeRouter.post("/run", asyncHandler(run));
codeRouter.post("/check", asyncHandler(check));
