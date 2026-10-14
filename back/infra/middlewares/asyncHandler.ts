import type { RequestHandler } from "express";

// Express 4 does not forward rejected promises to error middleware.
export const asyncHandler = (handler: RequestHandler): RequestHandler =>
  (request, response, next) => {
    Promise.resolve().then(() => handler(request, response, next)).catch(next);
  };
