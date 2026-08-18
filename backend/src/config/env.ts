import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

function optional(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

function requiredInProd(name: string): string | undefined {
  const v = optional(name);
  if (!v && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required env var ${name}`);
  }
  return v;
}

const frontendOrigins = (process.env.FRONTEND_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  frontendOrigin: frontendOrigins[0] ?? "http://localhost:3000",
  frontendOrigins,
  mongodbUri: optional("MONGODB_URI"),
  redisUrl: optional("REDIS_URL"),
  cloudinary: {
    cloudName: optional("CLOUDINARY_CLOUD_NAME"),
    apiKey: optional("CLOUDINARY_API_KEY"),
    apiSecret: optional("CLOUDINARY_API_SECRET"),
    folder: process.env.CLOUDINARY_UPLOAD_FOLDER ?? "kestrel/listings",
  },
  xero: {
    clientId: optional("XERO_CLIENT_ID"),
    clientSecret: optional("XERO_CLIENT_SECRET"),
    redirectUri:
      optional("XERO_REDIRECT_URI") ??
      "http://localhost:4000/api/integrations/xero/callback",
    tenantId: optional("XERO_TENANT_ID"),
  },
  pexa: {
    clientId: optional("PEXA_CLIENT_ID"),
    clientSecret: optional("PEXA_CLIENT_SECRET"),
    redirectUri:
      optional("PEXA_REDIRECT_URI") ??
      "http://localhost:4000/api/integrations/pexa/callback",
    apiBase: process.env.PEXA_API_BASE ?? "https://api.pexa.com.au",
  },
  internalApiKey: optional("INTERNAL_API_KEY"),
  jwtSecret: optional("JWT_SECRET") ?? "kestrel-dev-jwt-change-me",
  adminSeedEmail: optional("ADMIN_SEED_EMAIL") ?? "jignesh@kestrelcommercial.com",
  adminSeedPassword: optional("ADMIN_SEED_PASSWORD"),
  adminSignupOpen: (process.env.ADMIN_SIGNUP_OPEN ?? "true").toLowerCase() !== "false",
  adminInviteCode: optional("ADMIN_INVITE_CODE"),
  googleClientId: optional("GOOGLE_CLIENT_ID"),
  googleClientSecret: optional("GOOGLE_CLIENT_SECRET"),
  siteUrl: optional("SITE_URL") ?? "http://localhost:3000",
  notify: {
    emailTo: optional("NOTIFY_EMAIL_TO") ?? "jignesh@kestrelcommercial.com",
    smtpHost: optional("SMTP_HOST"),
    smtpPort: Number(process.env.SMTP_PORT ?? 587),
    smtpUser: optional("SMTP_USER"),
    smtpPass: optional("SMTP_PASS"),
    smtpFrom:
      optional("SMTP_FROM") ?? "Kestrel Commercial <jignesh@kestrelcommercial.com>",
    resendApiKey: optional("RESEND_API_KEY"),
    resendWebhookSecret: optional("RESEND_WEBHOOK_SECRET"),
    leadCaptureEmail: optional("LEAD_CAPTURE_EMAIL") ?? "leads@leads.kestrelcommercial.com",
    webhookUrl: optional("NOTIFY_WEBHOOK_URL"),
    formsubmit: (process.env.NOTIFY_FORMSUBMIT ?? "true").toLowerCase() !== "false",
    twilioSid: optional("TWILIO_ACCOUNT_SID"),
    twilioToken: optional("TWILIO_AUTH_TOKEN"),
    twilioWhatsAppFrom: optional("TWILIO_WHATSAPP_FROM"),
    whatsappTo: optional("NOTIFY_WHATSAPP_TO") ?? "whatsapp:+61431000038",
  },
  syndication: {
    realcommercialKey: optional("REALCOMMERCIAL_FEED_PROVIDER_KEY"),
    commercialRealEstateKey: optional("CRE_FEED_PROVIDER_KEY"),
  },
  isProd: (process.env.NODE_ENV ?? "development") === "production",
};

void requiredInProd;
