import { Router } from "express";
import { randomBytes } from "crypto";
import { env } from "../config/env";
import { HttpError } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/requireAuth";
import {
  exchangeXeroCode,
  isXeroConfigured,
  xeroAuthorizeUrl,
} from "../services/xero";
import {
  exchangePexaCode,
  isPexaConfigured,
  pexaAuthorizeUrl,
} from "../services/pexa";
import { SyncLogModel } from "../models/SyncLog";
import { isDbConnected } from "../db/mongoose";

export const integrationsRouter = Router();

integrationsRouter.get("/status", requireAuth, async (_req, res, next) => {
  try {
    const logs = isDbConnected()
      ? await SyncLogModel.find().sort({ createdAt: -1 }).limit(50).lean()
      : [];
    res.json({
      xero: {
        configured: isXeroConfigured(),
        note: isXeroConfigured()
          ? "Credentials present. Connect to start OAuth. Token exchange is still stubbed until the Xero app is live."
          : "Set XERO_CLIENT_ID / SECRET in backend .env, then Connect. Token exchange is still stubbed until the Xero app is live.",
      },
      pexa: {
        configured: isPexaConfigured(),
        note: isPexaConfigured()
          ? "Credentials present. Connect to start OAuth. Token exchange is still stubbed until the PEXA app is live."
          : "Set PEXA_CLIENT_ID / SECRET in backend .env, then Connect. Token exchange is still stubbed until the PEXA app is live.",
      },
      redis: Boolean(env.redisUrl),
      recentLogs: logs.map((log) => ({
        id: String(log._id),
        integration: log.integration,
        recordRef: log.recordRef,
        status: log.status,
        error: log.error || "",
        lastAttempt: log.lastAttempt ? new Date(log.lastAttempt as Date).toISOString() : null,
        createdAt: (log as { createdAt?: Date }).createdAt
          ? new Date((log as { createdAt?: Date }).createdAt as Date).toISOString()
          : null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

integrationsRouter.get("/xero/connect", requireAuth, (_req, res, next) => {
  try {
    if (!isXeroConfigured()) {
      throw new HttpError(
        503,
        "Xero is not configured. Set XERO_CLIENT_ID and XERO_CLIENT_SECRET in backend .env, then Connect.",
      );
    }
    const state = randomBytes(16).toString("hex");
    res.redirect(xeroAuthorizeUrl(state));
  } catch (err) {
    next(err);
  }
});

integrationsRouter.get("/xero/callback", async (req, res, next) => {
  try {
    const code = String(req.query.code ?? "");
    if (!code) throw new HttpError(400, "Missing Xero authorization code");
    await exchangeXeroCode(code);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

integrationsRouter.get("/pexa/connect", requireAuth, (_req, res, next) => {
  try {
    if (!isPexaConfigured()) {
      throw new HttpError(
        503,
        "PEXA is not configured. Set PEXA_CLIENT_ID and PEXA_CLIENT_SECRET in backend .env, then Connect.",
      );
    }
    const state = randomBytes(16).toString("hex");
    res.redirect(pexaAuthorizeUrl(state));
  } catch (err) {
    next(err);
  }
});

integrationsRouter.get("/pexa/callback", async (req, res, next) => {
  try {
    const code = String(req.query.code ?? "");
    if (!code) throw new HttpError(400, "Missing PEXA authorization code");
    await exchangePexaCode(code);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
