import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env";
import { HttpError } from "../middleware/errorHandler";

let configured = false;

function ensureConfigured() {
  if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
    throw new HttpError(
      503,
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET. This endpoint is real — it only needs credentials.",
    );
  }
  if (!configured) {
    cloudinary.config({
      cloud_name: env.cloudinary.cloudName,
      api_key: env.cloudinary.apiKey,
      api_secret: env.cloudinary.apiSecret,
      secure: true,
    });
    configured = true;
  }
}

/**
 * Sign a direct browser → Cloudinary upload.
 * Backend never receives or proxies image bytes; it stores public_ids only.
 */
export function signUpload(params?: { folder?: string; publicId?: string }) {
  ensureConfigured();
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = params?.folder ?? env.cloudinary.folder;
  const toSign: Record<string, string | number> = { timestamp, folder };
  if (params?.publicId) toSign.public_id = params.publicId;

  const signature = cloudinary.utils.api_sign_request(toSign, env.cloudinary.apiSecret!);

  return {
    timestamp,
    signature,
    apiKey: env.cloudinary.apiKey,
    cloudName: env.cloudinary.cloudName,
    folder,
    publicId: params?.publicId,
  };
}

export function isCloudinaryReady(): boolean {
  return Boolean(
    env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret,
  );
}
