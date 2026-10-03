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
import {
  disconnectZoho,
  exchangeZohoCode,
  isZohoConfigured,
  syncEnquiryToZoho,
  syncPendingEnquiries,
  zohoAuthorizeUrl,
  zohoStatus,
} from "../services/zoho";
import { SyncLogModel } from "../models/SyncLog";
import { isDbConnected } from "../db/mongoose";
import { readAuth } from "../middleware/requireAuth";
import { logActivity } from "../services/activity";

export const integrationsRouter = Router();

const ZOHO_STATE_COOKIE = "kestrel_zoho_state";
const ZOHO_STATE_PATH = "/api/integrations/zoho";

function settingsRedirect(result: string, reason?: string) {
  const params = new URLSearchParams({ zoho: result });
  if (reason) params.set("reason", reason.slice(0, 160));
  return `/admin/settings?${params.toString()}`;
}

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
      zoho: await zohoStatus(),
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

integrationsRouter.get("/zoho/connect", requireAuth, (_req, res, next) => {
  try {
    if (!isZohoConfigured()) {
      throw new HttpError(503, "Zoho is not configured. Set ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET in backend .env.");
    }
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is required to store the Zoho connection.");
    const state = randomBytes(16).toString("hex");
    res.cookie(ZOHO_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.isProd,
      path: ZOHO_STATE_PATH,
      maxAge: 10 * 60 * 1000,
    });
    res.redirect(zohoAuthorizeUrl(state));
  } catch (err) {
    next(err);
  }
});

integrationsRouter.get("/zoho/callback", async (req, res) => {
  const user = readAuth(req);
  if (!user) return res.redirect("/admin/login");
  const expected = req.cookies?.[ZOHO_STATE_COOKIE] as string | undefined;
  res.clearCookie(ZOHO_STATE_COOKIE, { path: ZOHO_STATE_PATH });

  if (req.query.error) return res.redirect(settingsRedirect("denied", String(req.query.error)));
  const code = String(req.query.code ?? "");
  if (!code || !expected || req.query.state !== expected) {
    return res.redirect(settingsRedirect("error", "Sign-in expired or was not started from Settings. Try Connect again."));
  }
  try {
    const { orgName } = await exchangeZohoCode({
      code,
      accountsServer: req.query["accounts-server"],
      by: user.name || user.email,
    });
    await logActivity({
      type: "integration.connect",
      entityType: "integration",
      entityId: "zoho",
      summary: `Connected Zoho CRM${orgName ? ` (${orgName})` : ""}`,
      by: user.name || user.email,
    });
    res.redirect(settingsRedirect("connected"));
  } catch (err) {
    res.redirect(settingsRedirect("error", err instanceof Error ? err.message : "Zoho connection failed."));
  }
});

integrationsRouter.post("/zoho/disconnect", requireAuth, async (req, res, next) => {
  try {
    await disconnectZoho();
    await logActivity({
      type: "integration.disconnect",
      entityType: "integration",
      entityId: "zoho",
      summary: "Disconnected Zoho CRM",
      by: req.user?.name || req.user?.email || "desk",
    });
    res.json(await zohoStatus());
  } catch (err) {
    next(err);
  }
});

integrationsRouter.post("/zoho/sync-pending", requireAuth, async (_req, res, next) => {
  try {
    res.json(await syncPendingEnquiries());
  } catch (err) {
    next(err instanceof Error && !(err instanceof HttpError) ? new HttpError(400, err.message) : err);
  }
});

integrationsRouter.post("/zoho/sync/:enquiryId", requireAuth, async (req, res, next) => {
  try {
    res.json(await syncEnquiryToZoho(req.params.enquiryId));
  } catch (err) {
    next(err instanceof Error && !(err instanceof HttpError) ? new HttpError(400, err.message) : err);
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
