import { Router } from "express";
import { ProductController } from "../../src/controller/ProductController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();
const controller = new ProductController();

router.get("/", authMiddleware, asyncHandler(controller.dashboard));

export default router;
