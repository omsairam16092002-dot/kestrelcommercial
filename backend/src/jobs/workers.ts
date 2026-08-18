/**
 * Run separately from the HTTP server: `npm run worker -w backend`
 * so a crash in Xero/PEXA cannot take down listing pages.
 */
import { Worker } from "bullmq";
import { connectDb } from "../db/mongoose";
import { SyncLogModel } from "../models/SyncLog";
import { createSoldInvoice, isXeroConfigured } from "../services/xero";
import { isPexaConfigured, pollSettlementStatus } from "../services/pexa";
import { getRedis, QUEUE_PEXA, QUEUE_XERO } from "./queue";

async function logSync(input: {
  integration: "xero" | "pexa";
  recordRef: string;
  status: "pending" | "running" | "success" | "failed" | "skipped";
  error?: string;
  meta?: Record<string, unknown>;
}) {
  try {
    await SyncLogModel.create({
      ...input,
      lastAttempt: new Date(),
    });
  } catch (err) {
    console.error("[sync-log] write failed", err);
  }
}

async function main() {
  await connectDb();
  const connection = getRedis();
  if (!connection) {
    console.error("[worker] REDIS_URL missing — exiting. STUB until Upstash is configured.");
    process.exit(1);
  }

  const xeroWorker = new Worker(
    QUEUE_XERO,
    async (job) => {
      const ref = String(job.data.propertyId ?? job.id);
      if (!isXeroConfigured()) {
        await logSync({
          integration: "xero",
          recordRef: ref,
          status: "skipped",
          error: "XERO_CLIENT_ID / XERO_CLIENT_SECRET not set",
        });
        return;
      }
      await logSync({ integration: "xero", recordRef: ref, status: "running" });
      try {
        await createSoldInvoice(job.data);
        await logSync({ integration: "xero", recordRef: ref, status: "success" });
      } catch (err) {
        await logSync({
          integration: "xero",
          recordRef: ref,
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    },
    { connection },
  );

  const pexaWorker = new Worker(
    QUEUE_PEXA,
    async (job) => {
      const ref = String(job.data.workspaceId ?? job.data.propertyId ?? job.id);
      if (!isPexaConfigured()) {
        await logSync({
          integration: "pexa",
          recordRef: ref,
          status: "skipped",
          error: "PEXA_CLIENT_ID / PEXA_CLIENT_SECRET not set",
        });
        return;
      }
      await logSync({ integration: "pexa", recordRef: ref, status: "running" });
      try {
        await pollSettlementStatus(job.data);
        await logSync({ integration: "pexa", recordRef: ref, status: "success" });
      } catch (err) {
        await logSync({
          integration: "pexa",
          recordRef: ref,
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    },
    { connection },
  );

  xeroWorker.on("failed", (job, err) => {
    console.error("[xero-worker] failed", job?.id, err.message);
  });
  pexaWorker.on("failed", (job, err) => {
    console.error("[pexa-worker] failed", job?.id, err.message);
  });

  console.info("[worker] listening on", QUEUE_XERO, "and", QUEUE_PEXA);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
