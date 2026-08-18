/** Empty or Unsplash fixture ids — not an uploaded Cloudinary asset. */
export function isStockImageId(publicId?: string | null): boolean {
  if (publicId?.startsWith("local:")) return false;
  if (!publicId) return true;
  const id = publicId.trim();
  return !id || id.startsWith("unsplash:");
}

export function isLocalImageId(publicId?: string | null): boolean {
  return Boolean(publicId?.startsWith("local:"));
}

/**
 * Cloudinary URLs only. Backend never proxies image bytes.
 * Use f_auto,q_auto:good,c_limit,dpr_auto on every delivery URL.
 */
export function cloudinaryUrl(
  cloudName: string,
  publicId: string,
  options?: { width?: number; height?: number; crop?: string },
): string {
  const transforms = ["f_auto", "q_auto:good", "c_limit", "dpr_auto"];
  if (options?.width) transforms.push(`w_${options.width}`);
  if (options?.height) transforms.push(`h_${options.height}`);
  if (options?.crop) transforms.push(`c_${options.crop}`);
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms.join(",")}/${publicId}`;
}

const STOCK_LISTING =
  "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1600&q=80";

/** Fixture helper: unsplash:<id> or a Cloudinary public_id. Never map a Cloudinary id to Unsplash. */
export function resolveImageSrc(
  publicId: string,
  cloudName?: string,
  options?: { width?: number; height?: number },
): string {
  if (publicId.startsWith("local:")) {
    const rel = publicId.slice("local:".length).replace(/^\/+/, "");
    return `/listings/${rel}`;
  }
  if (!publicId || isStockImageId(publicId)) {
    if (publicId?.startsWith("unsplash:")) {
      const id = publicId.slice("unsplash:".length);
      const w = options?.width ?? 1600;
      return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;
    }
    return STOCK_LISTING.replace("w=1600", `w=${options?.width ?? 1600}`);
  }
  if (publicId.startsWith("http://") || publicId.startsWith("https://")) {
    return publicId;
  }
  if (cloudName) {
    return cloudinaryUrl(cloudName, publicId, options);
  }
  return "";
}
