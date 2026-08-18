/**
 * Xero integration — STUB until XERO_CLIENT_ID / XERO_CLIENT_SECRET arrive.
 *
 * Intended OAuth2 authorization-code flow (Xero does not offer a simple
 * client-credentials grant for the accounting API in most partner apps):
 *
 * 1. Agent (or admin) hits GET /api/integrations/xero/connect
 *    → redirect to https://login.xero.com/identity/connect/authorize
 *      ?response_type=code
 *      &client_id=XERO_CLIENT_ID
 *      &redirect_uri=XERO_REDIRECT_URI
 *      &scope=openid profile email accounting.transactions accounting.contacts offline_access
 *      &state=<csrf>
 *
 * 2. Xero redirects to GET /api/integrations/xero/callback?code=...&state=...
 *    → exchange code for access_token + refresh_token at
 *      https://identity.xero.com/connect/token
 *    → persist tokens + tenant id (from GET https://api.xero.com/connections)
 *      in a secrets store / env, never in Mongo documents that the frontend can read.
 *
 * 3. When an agent marks a property `sold`, enqueue BullMQ job `xero:invoice-sold`
 *    with { propertyId, salePrice, buyerRef }. NEVER call Xero inline on the
 *    HTTP request the user is waiting on.
 *
 * 4. Worker: refresh token if needed → POST Invoices on the Xero Accounting API
 *    → write SyncLog { integration: "xero", recordRef, status }.
 *
 * Do not fabricate invoice IDs or success responses. If credentials are missing,
 * jobs must log `skipped` and stop.
 */

import { env } from "../config/env";

export function isXeroConfigured(): boolean {
  return Boolean(env.xero.clientId && env.xero.clientSecret);
}

export function xeroAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.xero.clientId ?? "",
    redirect_uri: env.xero.redirectUri,
    scope:
      "openid profile email accounting.transactions accounting.contacts offline_access",
    state,
  });
  return `https://login.xero.com/identity/connect/authorize?${params.toString()}`;
}

export async function exchangeXeroCode(_code: string): Promise<never> {
  throw new Error(
    "Xero token exchange is STUBBED. Register a Xero app, set XERO_CLIENT_ID / XERO_CLIENT_SECRET, then implement the token POST to https://identity.xero.com/connect/token.",
  );
}

export async function createSoldInvoice(_payload: {
  propertyId: string;
  salePrice: number;
  buyerRef?: string;
}): Promise<never> {
  throw new Error(
    "Xero createSoldInvoice is STUBBED pending live credentials. Job runner must record SyncLog status=skipped.",
  );
}
