import { BRAND } from "./constants";
import { PROPERTY_STATUSES, type PropertyStatus, type TransactionSide } from "./types";

export const STATUS_LABELS: Record<PropertyStatus, string> = {
  "for-sale": "FOR SALE",
  "for-lease": "FOR LEASE",
  "under-offer": "UNDER OFFER",
  sold: "SOLD",
  leased: "LEASED",
};

/**
 * Sale-side = oxblood. Lease-side = tan.
 * for-sale / sold → sale (oxblood)
 * for-lease / leased → lease (tan)
 * under-offer uses explicit transactionSide.
 */
export function statusSide(
  status: PropertyStatus,
  transactionSide?: TransactionSide,
): TransactionSide {
  if (status === "for-sale" || status === "sold") return "sale";
  if (status === "for-lease" || status === "leased") return "lease";
  return transactionSide ?? "sale";
}

export function statusTone(
  status: PropertyStatus,
  transactionSide?: TransactionSide,
): "oxblood" | "tan" {
  return statusSide(status, transactionSide) === "sale" ? "oxblood" : "tan";
}

export function statusColor(
  status: PropertyStatus,
  transactionSide?: TransactionSide,
): string {
  return statusTone(status, transactionSide) === "oxblood" ? BRAND.oxblood : BRAND.tan;
}

export function isAvailableStatus(status: PropertyStatus): boolean {
  return status === "for-sale" || status === "for-lease" || status === "under-offer";
}

export function statusesForSide(side: TransactionSide | "all"): PropertyStatus[] {
  if (side === "sale") return ["for-sale", "under-offer", "sold"];
  if (side === "lease") return ["for-lease", "under-offer", "leased"];
  return [...PROPERTY_STATUSES];
}

/** Map legacy `auction` rows (and anything unknown) onto live statuses. */
export function normalizePropertyStatus(raw: unknown, side?: TransactionSide): PropertyStatus {
  const value = String(raw ?? "").toLowerCase();
  if (value === "auction") return "for-sale";
  if ((PROPERTY_STATUSES as readonly string[]).includes(value)) {
    return value as PropertyStatus;
  }
  if (side === "lease") return "for-lease";
  return "for-sale";
}
