import { Router } from "express";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { env } from "../config/env";
import { isDbConnected } from "../db/mongoose";
import { UserModel } from "../models/User";
import { HttpError } from "../middleware/errorHandler";
import {
  clearAuthCookies,
  requireAuth,
  setAuthCookies,
  type AuthPayload,
} from "../middleware/requireAuth";

export const authRouter = Router();

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
  name: z.string().trim().min(1).optional(),
  inviteCode: z.string().optional(),
});

function publicUser(user: { _id?: unknown; id?: string; email: string; name: string; role: string }) {
  return {
    id: String(user._id ?? user.id),
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

function signupAllowed(inviteCode?: string) {
  if (env.adminSignupOpen) return true;
  if (env.adminInviteCode && inviteCode && inviteCode === env.adminInviteCode) return true;
  return false;
}

authRouter.post("/register", async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const parsed = credentialsSchema.parse(req.body);
    if (!signupAllowed(parsed.inviteCode)) {
      throw new HttpError(403, "Signup is invite-only. Ask the desk for a code.");
    }
    const exists = await UserModel.findOne({ email: parsed.email });
    if (exists) throw new HttpError(409, "That email already has a desk login.");
    const created = await UserModel.create({
      email: parsed.email,
      name: parsed.name || parsed.email.split("@")[0],
      role: "admin",
      passwordHash: await bcrypt.hash(parsed.password, 12),
    });
    const user = publicUser(created);
    setAuthCookies(res, user as AuthPayload);
    res.status(201).json({ ok: true, user });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const parsed = credentialsSchema.pick({ email: true, password: true }).parse(req.body);
    const found = await UserModel.findOne({ email: parsed.email });
    if (!found?.passwordHash) throw new HttpError(401, "Email or password is wrong.");
    const ok = await bcrypt.compare(parsed.password, found.passwordHash);
    if (!ok) throw new HttpError(401, "Email or password is wrong.");
    const user = publicUser(found);
    setAuthCookies(res, user as AuthPayload);
    res.json({ ok: true, user });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/google", async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    if (!env.googleClientId) throw new HttpError(503, "Google sign-in is not configured.");
    const parsed = z.object({ credential: z.string().min(1), inviteCode: z.string().optional() }).parse(req.body);
    const client = new OAuth2Client(env.googleClientId);
    const ticket = await client.verifyIdToken({
      idToken: parsed.credential,
      audience: env.googleClientId,
    });
    const payload = ticket.getPayload();
    const email = payload?.email?.toLowerCase();
    const googleId = payload?.sub;
    if (!email || !googleId) throw new HttpError(401, "Google did not return an email.");

    let found = await UserModel.findOne({ $or: [{ email }, { googleId }] });
    if (!found) {
      if (!signupAllowed(parsed.inviteCode)) {
        throw new HttpError(403, "No desk account for that Google email. Sign up first or use an invite code.");
      }
      found = await UserModel.create({
        email,
        googleId,
        name: payload.name || email.split("@")[0],
        role: "admin",
      });
    } else if (!found.googleId) {
      found.googleId = googleId;
      if (!found.name && payload.name) found.name = payload.name;
      await found.save();
    }
    const user = publicUser(found);
    setAuthCookies(res, user as AuthPayload);
    res.json({ ok: true, user });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

authRouter.post("/logout", (_req, res) => {
  clearAuthCookies(res);
  res.json({ ok: true });
});
