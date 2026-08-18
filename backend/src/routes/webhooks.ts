import { Router } from "express";
import {
  extractInboundPayload,
  processInboundEmail,
  verifyResendSignature,
} from "../services/inboundLeads";

export const webhooksRouter = Router();

webhooksRouter.post("/resend-inbound", async (req, res, next) => {
  try {
    const raw = req.rawBody ? req.rawBody.toString("utf8") : JSON.stringify(req.body ?? {});
    const headers: Record<string, string | string[] | undefined> = {};
    for (const [key, value] of Object.entries(req.headers)) headers[key] = value;
    verifyResendSignature(raw, headers);
    const payload = extractInboundPayload(req.body);
    const result = await processInboundEmail(payload);
    res.status(202).json({
      ok: true,
      inboundId: String((result.inbound as { _id?: unknown })._id ?? ""),
      parseStatus: (result.inbound as { parseStatus?: string }).parseStatus,
      enquiryId: result.enquiry ? String(result.enquiry.id ?? result.enquiry._id ?? "") : null,
      duplicate: result.duplicate,
    });
  } catch (err) {
    console.warn("[webhook] resend-inbound rejected", err instanceof Error ? err.message : err);
    next(err);
  }
});
