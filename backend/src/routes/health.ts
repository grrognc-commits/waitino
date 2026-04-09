import { Router } from "express";
import { ApiResponse } from "../types";

const router = Router();

router.get("/", (_req, res) => {
  const response: ApiResponse<{ status: string }> = {
    success: true,
    data: { status: "ok" },
  };
  res.json(response);
});

export default router;
