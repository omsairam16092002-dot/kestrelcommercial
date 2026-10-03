import { runListingAlerts } from "./alerts";
import { runBookingReminders } from "./bookings";
import { runScheduledEmails } from "./emailAutomation";
import { runLeadEscalations } from "./speedToLead";
import { pollZohoLeadStatuses } from "./zoho";

const TICK_MS = 5 * 60 * 1000;
/** Nudge and stale-lead emails are daily-ish; no need to scan for them every tick. */
const EMAIL_AUTOMATION_EVERY = 3;

const jobs: { name: string; every: number; run: () => Promise<unknown> }[] = [
  { name: "lead-escalations", every: 1, run: () => runLeadEscalations() },
  { name: "booking-reminders", every: 1, run: () => runBookingReminders() },
  { name: "listing-alerts", every: 1, run: () => runListingAlerts() },
  { name: "zoho-status-poll", every: 1, run: () => pollZohoLeadStatuses() },
  { name: "email-automations", every: EMAIL_AUTOMATION_EVERY, run: () => runScheduledEmails() },
];

let tickCount = 0;
let running = false;

async function tick() {
  if (running) return;
  running = true;
  tickCount += 1;
  try {
    for (const job of jobs) {
      if (tickCount % job.every !== 0) continue;
      try {
        await job.run();
      } catch (err) {
        console.error(`[scheduler:${job.name}]`, err);
      }
    }
  } finally {
    running = false;
  }
}

export function startScheduler() {
  setTimeout(() => void tick(), 60 * 1000);
  setInterval(() => void tick(), TICK_MS);
}
