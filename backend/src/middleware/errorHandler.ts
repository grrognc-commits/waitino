import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../types";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response<ApiResponse>,
  _next: NextFunction
): void {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: "Interna pogreška poslužitelja",
  });
}
