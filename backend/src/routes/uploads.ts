import { Router } from "express";
import { signUpload, isCloudinaryReady } from "../services/cloudinary";
import { requireAuth } from "../middleware/requireAuth";
import { isDbConnected } from "../db/mongoose";

export const uploadsRouter = Router();

uploadsRouter.get("/status", (_req, res) => {
  res.json({
    ready: isCloudinaryReady(),
    db: isDbConnected() ? "mongo" : "fixtures",
    note: isCloudinaryReady()
      ? "Signed upload endpoint is live."
      : "STUB until CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET are set. The signing code is real.",
  });
});

uploadsRouter.post("/sign", requireAuth, (req, res, next) => {
  try {
    const folder = typeof req.body?.folder === "string" ? req.body.folder : undefined;
    const publicId = typeof req.body?.publicId === "string" ? req.body.publicId : undefined;
    const signed = signUpload({ folder, publicId });
    res.json(signed);
  } catch (err) {
    next(err);
  }
});
