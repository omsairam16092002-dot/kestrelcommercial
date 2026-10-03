import { env } from "./config/env";
import { connectDb } from "./db/mongoose";
import { createApp } from "./app";
import { seedAdminUser } from "./services/seedAdmin";
import { startScheduler } from "./services/scheduler";

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

  startScheduler();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
