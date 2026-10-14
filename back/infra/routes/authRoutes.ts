import { Router } from "express";
import { AuthController } from "../../src/controller/AuthController";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();
const controller = new AuthController();

router.post("/login", asyncHandler(controller.login));

export default router;
