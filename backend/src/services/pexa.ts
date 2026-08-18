/**
 * PEXA integration — STUB until PEXA_CLIENT_ID / PEXA_CLIENT_SECRET arrive.
 *
 * Intended settlement-status polling flow:
 *
 * 1. OAuth2 authorization-code (or client-credentials if PEXA issues one for
 *    this partner class) via GET /api/integrations/pexa/connect
 *    → PEXA authorize URL with client_id, redirect_uri, scope, state.
 *
 * 2. Callback stores access + refresh tokens off-box (same rule as Xero:
 *    never in documents the public API returns).
 *
 * 3. When a sale goes unconditional / a PEXA workspace id is attached to a
 *    property, enqueue BullMQ job `pexa:poll-settlement` with
 *    { propertyId, workspaceId }. Repeat on a schedule (e.g. every 30 min
 *    while status is not SETTLED / CANCELLED) via a repeatable job.
 *
 * 4. Worker: GET workspace / settlement status from PEXA_API_BASE
 *    → update property CRM fields (not public status unless instructed)
 *    → write SyncLog { integration: "pexa", recordRef, status, meta }.
 *
 * Do not fabricate workspace statuses. Missing credentials → SyncLog skipped.
 */

import { env } from "../config/env";

export function isPexaConfigured(): boolean {
  return Boolean(env.pexa.clientId && env.pexa.clientSecret);
}

export function pexaAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.pexa.clientId ?? "",
    redirect_uri: env.pexa.redirectUri,
    scope: "settlement.read workspace.read",
    state,
  });
  return `${env.pexa.apiBase}/oauth/authorize?${params.toString()}`;
}

export async function exchangePexaCode(_code: string): Promise<never> {
  throw new Error(
    "PEXA token exchange is STUBBED. Register a PEXA integration, set PEXA_CLIENT_ID / PEXA_CLIENT_SECRET, then implement the token exchange.",
  );
}

export async function pollSettlementStatus(_payload: {
  propertyId: string;
  workspaceId: string;
}): Promise<never> {
  throw new Error(
    "PEXA pollSettlementStatus is STUBBED pending live credentials. Job runner must record SyncLog status=skipped.",
  );
}
