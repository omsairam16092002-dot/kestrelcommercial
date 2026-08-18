import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { HttpError } from "./errorHandler";

export const AUTH_COOKIE = "kestrel_admin";
export const DESK_FLAG_COOKIE = "kestrel_desk";

export type AuthPayload = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export function signAuthToken(user: AuthPayload) {
  return jwt.sign(user, env.jwtSecret, { expiresIn: "7d" });
}

export function setAuthCookies(res: Response, user: AuthPayload) {
  const token = signAuthToken(user);
  const base = {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: env.isProd,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
  res.cookie(AUTH_COOKIE, token, { ...base, httpOnly: true });
  res.cookie(DESK_FLAG_COOKIE, "1", { ...base, httpOnly: false });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(AUTH_COOKIE, { path: "/" });
  res.clearCookie(DESK_FLAG_COOKIE, { path: "/" });
}

export function readAuth(req: Request): AuthPayload | null {
  const token = req.cookies?.[AUTH_COOKIE] as string | undefined;
  const header = req.headers.authorization;
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const raw = token || bearer;
  if (!raw) return null;
  try {
    return jwt.verify(raw, env.jwtSecret) as AuthPayload;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const user = readAuth(req);
  if (!user) return next(new HttpError(401, "Sign in to the desk."));
  req.user = user;
  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  req.user = readAuth(req) ?? undefined;
  next();
}
