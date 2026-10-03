import type { EnquiryIntent, LeadScore } from "./types";

export const LEAD_SCORE_LABELS: Record<LeadScore, string> = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
};

/** Rule-based score from what the person actually did. Booked time and seller intent beat browsing. */
export function scoreLead(input: {
  intent?: EnquiryIntent | null;
  source: string;
  topic?: string | null;
  propertySlug?: string | null;
  booked?: boolean;
}): LeadScore {
  if (input.booked) return "hot";
  if (input.intent === "inspection") return "hot";
  if (input.source === "eoi" || input.source === "appraisal" || input.source === "appraisal-quick") return "hot";
  if (input.topic === "selling" || input.topic === "leasing-out" || input.topic === "appraisal") return "hot";
  if (input.intent === "brochure") return "warm";
  if (input.propertySlug) return "warm";
  if (input.source === "portal-rea" || input.source === "portal-realcommercial") return "warm";
  return "cold";
}
