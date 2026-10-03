import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

export type QaManifest = {
  runId: string;
  startedAt: string;
  environment: string;
  listingSlugs: string[];
  listingIds: string[];
  enquiryEmails: string[];
  contactEmails: string[];
  subscriberEmails: string[];
  taskIds: string[];
  inboundEmailIds: string[];
  userIds: string[];
  enquiryIds: string[];
};

const MANIFEST_PATH = path.join(process.cwd(), "docs", "qa", "qa-manifest.json");

function ensureDir() {
  const dir = path.dirname(MANIFEST_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function loadManifest(): QaManifest {
  ensureDir();
  if (!existsSync(MANIFEST_PATH)) {
    return initManifest();
  }
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as QaManifest;
}

export function initManifest(environment = "local"): QaManifest {
  const manifest: QaManifest = {
    runId: `qa-${Date.now()}`,
    startedAt: new Date().toISOString(),
    environment,
    listingSlugs: [],
    listingIds: [],
    enquiryEmails: [],
    contactEmails: [],
    subscriberEmails: [],
    taskIds: [],
    inboundEmailIds: [],
    userIds: [],
    enquiryIds: [],
  };
  saveManifest(manifest);
  return manifest;
}

export function saveManifest(manifest: QaManifest) {
  ensureDir();
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function uniq<T>(arr: T[], value: T) {
  if (!arr.includes(value)) arr.push(value);
}

export function trackListing(manifest: QaManifest, slug: string, id?: string) {
  uniq(manifest.listingSlugs, slug);
  if (id) uniq(manifest.listingIds, id);
  saveManifest(manifest);
}

export function trackEmail(manifest: QaManifest, kind: "enquiry" | "contact" | "subscriber", email: string) {
  if (kind === "enquiry") uniq(manifest.enquiryEmails, email);
  else if (kind === "contact") uniq(manifest.contactEmails, email);
  else uniq(manifest.subscriberEmails, email);
  saveManifest(manifest);
}

export function trackId(
  manifest: QaManifest,
  kind: "task" | "inboundEmail" | "user" | "enquiry",
  id: string,
) {
  if (kind === "task") uniq(manifest.taskIds, id);
  else if (kind === "inboundEmail") uniq(manifest.inboundEmailIds, id);
  else if (kind === "user") uniq(manifest.userIds, id);
  else uniq(manifest.enquiryIds, id);
  saveManifest(manifest);
}

export function manifestPath() {
  return MANIFEST_PATH;
}
