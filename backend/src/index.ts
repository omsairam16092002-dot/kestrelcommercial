import { env } from "./config/env";
import { connectDb } from "./db/mongoose";
import { createApp } from "./app";
import { seedAdminUser } from "./services/seedAdmin";
import { runScheduledEmails } from "./services/emailAutomation";

async function main() {
  try {
    await connectDb();
    await seedAdminUser();
  } catch (err) {
    if (env.isProd) throw err;
    console.warn("[boot] continuing without Mongo — serving fixtures. ", err);
  }

  const app = createApp();
  app.listen(env.port, () => {
    console.info(`[kestrel-api] listening on :${env.port}`);
    console.info(`[kestrel-api] CORS origin: ${env.frontendOrigin}`);
  });

  const tick = 15 * 60 * 1000;
  setInterval(() => {
    void runScheduledEmails().catch((err) => console.error("[email-automations]", err));
  }, tick);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
