import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "Not found" });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    const message = err.issues[0]?.message ?? "Invalid request";
    return res.status(400).json({ error: message, details: err.issues });
  }
  const status = err instanceof HttpError ? err.status : 500;
  const message = err instanceof Error ? err.message : "Server error";
  if (status >= 500) console.error(err);
  res.status(status).json({ error: message });
}
