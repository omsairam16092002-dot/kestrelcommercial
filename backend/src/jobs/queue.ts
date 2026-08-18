import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config/env";

let connection: IORedis | null = null;

export function getRedis(): IORedis | null {
  if (!env.redisUrl) {
    console.warn(
      "[jobs] REDIS_URL not set — BullMQ queues are disabled. STUB until Upstash credentials arrive.",
    );
    return null;
  }
  if (!connection) {
    connection = new IORedis(env.redisUrl, { maxRetriesPerRequest: null });
  }
  return connection;
}

export const QUEUE_XERO = "kestrel-xero";
export const QUEUE_PEXA = "kestrel-pexa";

export function getXeroQueue(): Queue | null {
  const conn = getRedis();
  if (!conn) return null;
  return new Queue(QUEUE_XERO, { connection: conn });
}

export function getPexaQueue(): Queue | null {
  const conn = getRedis();
  if (!conn) return null;
  return new Queue(QUEUE_PEXA, { connection: conn });
}

export async function enqueueXeroSoldInvoice(data: {
  propertyId: string;
  salePrice: number;
  buyerRef?: string;
}) {
  const queue = getXeroQueue();
  if (!queue) {
    console.warn("[jobs] cannot enqueue xero:invoice-sold — Redis not configured");
    return { enqueued: false, reason: "redis-missing" as const };
  }
  await queue.add("xero:invoice-sold", data, {
    attempts: 5,
    backoff: { type: "exponential", delay: 15_000 },
  });
  return { enqueued: true as const };
}

export async function enqueuePexaPoll(data: {
  propertyId: string;
  workspaceId: string;
}) {
  const queue = getPexaQueue();
  if (!queue) {
    console.warn("[jobs] cannot enqueue pexa:poll-settlement — Redis not configured");
    return { enqueued: false, reason: "redis-missing" as const };
  }
  await queue.add("pexa:poll-settlement", data, {
    attempts: 8,
    backoff: { type: "exponential", delay: 30_000 },
  });
  return { enqueued: true as const };
}
