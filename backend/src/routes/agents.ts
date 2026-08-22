import { Router } from "express";
import { AGENTS } from "@kestrel/shared";
import { isDbConnected } from "../db/mongoose";
import { AgentModel } from "../models/Agent";
import { serializeAgent } from "../utils/serialize";
import { requireAuth } from "../middleware/requireAuth";
import { publicCache } from "../middleware/publicCache";
import { HttpError } from "../middleware/errorHandler";
import { logActivity } from "../services/activity";
import { z } from "zod";

export const agentsRouter = Router();

agentsRouter.get("/", publicCache(), async (_req, res, next) => {
  try {
    if (!isDbConnected()) return res.json(AGENTS);
    const docs = await AgentModel.find().lean();
    if (!docs.length) return res.json(AGENTS);
    res.json(docs.map((d) => serializeAgent(d as Record<string, unknown>)));
  } catch (err) {
    next(err);
  }
});

agentsRouter.patch("/:licenceNumber", requireAuth, async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const parsed = z
      .object({
        name: z.string().min(1).optional(),
        phone: z.string().min(1).optional(),
        email: z.string().email().optional(),
        title: z.string().optional(),
        bio: z.string().optional(),
        photoPublicId: z.string().optional(),
      })
      .parse(req.body);
    const updated = await AgentModel.findOneAndUpdate(
      { licenceNumber: req.params.licenceNumber },
      parsed,
      { new: true },
    );
    if (!updated) throw new HttpError(404, "Agent not found");
    await logActivity({
      type: "agent.patch",
      entityType: "agent",
      entityId: updated.licenceNumber,
      summary: parsed.photoPublicId ? `Updated portrait · ${updated.name}` : `Updated agent · ${updated.name}`,
      by: req.user?.name || req.user?.email || "desk",
    });
    res.json(serializeAgent(updated.toObject()));
  } catch (err) {
    next(err);
  }
});

agentsRouter.get("/:licenceNumber", async (req, res, next) => {
  try {
    if (!isDbConnected()) {
      const found =
        AGENTS.find((a) => a.licenceNumber === req.params.licenceNumber) ?? AGENTS[0];
      return res.json(found);
    }
    const doc = await AgentModel.findOne({ licenceNumber: req.params.licenceNumber }).lean();
    if (!doc) {
      const found =
        AGENTS.find((a) => a.licenceNumber === req.params.licenceNumber) ?? AGENTS[0];
      return res.json(found);
    }
    res.json(serializeAgent(doc as Record<string, unknown>));
  } catch (err) {
    next(err);
  }
});
