import { Router } from "express";
import { ProductController } from "../../src/controller/ProductController";
import { authMiddleware, adminOnly } from "../middlewares/authMiddleware";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();
const controller = new ProductController();

router.get("/", asyncHandler(controller.list));
router.post("/", authMiddleware, adminOnly, asyncHandler(controller.create));
router.delete("/:id", authMiddleware, adminOnly, asyncHandler(controller.remove));

export default router;
