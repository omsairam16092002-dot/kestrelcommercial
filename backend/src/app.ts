import { env } from "./config/env";
import { propertiesRouter } from "./routes/properties";
import { enquiriesRouter } from "./routes/enquiries";
import { newsletterRouter } from "./routes/newsletter";
import { agentsRouter } from "./routes/agents";
import { uploadsRouter } from "./routes/uploads";
import { integrationsRouter } from "./routes/integrations";
import { authRouter } from "./routes/auth";
import { adminRouter } from "./routes/admin";
import { contactsRouter } from "./routes/contacts";
import { tasksRouter } from "./routes/tasks";
import { webhooksRouter } from "./routes/webhooks";
import { inboundAdminRouter } from "./routes/inboundAdmin";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { isCloudinaryReady } from "./services/cloudinary";
import { isXeroConfigured } from "./services/xero";
import { isPexaConfigured } from "./services/pexa";
import { isDbConnected } from "./db/mongoose";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import compression from "compression";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(compression());
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin || env.frontendOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`CORS blocked: ${origin}`));
      },
      credentials: true,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Internal-Key"],
    }),
  );
  app.use(cookieParser());
  app.use(
    "/api/webhooks",
    express.raw({ type: "application/json" }),
    (req, _res, next) => {
      req.rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(String(req.body ?? ""));
      try {
        req.body = JSON.parse(req.rawBody.toString("utf8") || "{}");
      } catch {
        req.body = {};
      }
      next();
    },
    webhooksRouter,
  );
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "kestrel-api",
      db: isDbConnected() ? "mongo" : "fixtures",
      cloudinary: isCloudinaryReady(),
      xero: isXeroConfigured(),
      pexa: isPexaConfigured(),
      redis: Boolean(env.redisUrl),
    });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/admin", inboundAdminRouter);
  app.use("/api/properties", propertiesRouter);
  app.use("/api/enquiries", enquiriesRouter);
  app.use("/api/contacts", contactsRouter);
  app.use("/api/tasks", tasksRouter);
  app.use("/api/newsletter", newsletterRouter);
  app.use("/api/agents", agentsRouter);
  app.use("/api/uploads", uploadsRouter);
  app.use("/api/integrations", integrationsRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
