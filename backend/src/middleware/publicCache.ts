import type { Request, Response, NextFunction } from "express";

/** Public GET responses — align with frontend ISR (60s) + short CDN/browser cache. */
export function publicCache(maxAgeSeconds = 60) {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Cache-Control", `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds}, stale-while-revalidate=120`);
    next();
  };
}
