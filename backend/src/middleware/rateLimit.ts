import type { NextFunction, Request, Response } from "express";

/**
 * Small in-memory fixed-window limiter for public write endpoints.
 * Per process only — good enough for one Render instance; swap for Redis if the API scales out.
 */
export function rateLimit({ windowMs, max, message }: { windowMs: number; max: number; message: string }) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const row = hits.get(key);
    if (!row || row.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      if (hits.size > 5000) {
        for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
      }
      return next();
    }
    row.count += 1;
    if (row.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((row.resetAt - now) / 1000)));
      return res.status(429).json({ error: message });
    }
    next();
  };
}
