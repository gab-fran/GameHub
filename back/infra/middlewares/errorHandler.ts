import type { NextFunction, Request, Response } from "express";

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction
) {
  if (error instanceof Error && "status" in error && (error.status === 400 || error.status === 404)) {
    response.status(error.status).json({ message: error.message });
    return;
  }
  console.error("[API ERROR]", error);
  response.status(500).json({ message: "Ocorreu um erro interno." });
}
