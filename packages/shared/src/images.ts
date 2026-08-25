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

export type ListingImageContext = "gallery" | "thumb" | "card" | "flagship" | "original" | "portrait";

const CONTEXT_PRESETS: Record<
  ListingImageContext,
  { crop: string; gravity?: string; aspectRatio?: string }
> = {
  gallery: { crop: "fill", gravity: "auto", aspectRatio: "16:9" },
  thumb: { crop: "fill", gravity: "auto", aspectRatio: "3:2" },
  card: { crop: "fill", gravity: "auto", aspectRatio: "4:3" },
  flagship: { crop: "fill", gravity: "auto", aspectRatio: "16:9" },
  original: { crop: "limit" },
  /** Agent headshot — face gravity in a classic portrait frame. */
  portrait: { crop: "fill", gravity: "face", aspectRatio: "4:5" },
};

/**
 * Cloudinary URLs only. Backend never proxies image bytes.
 * Default delivery uses c_limit; listing contexts use c_fill,g_auto with fixed aspect ratios.
 */
export function cloudinaryUrl(
  cloudName: string,
  publicId: string,
  options?: {
    width?: number;
    height?: number;
    crop?: string;
    gravity?: string;
    aspectRatio?: string;
    context?: ListingImageContext;
  },
): string {
  const preset = options?.context ? CONTEXT_PRESETS[options.context] : null;
  const crop = options?.crop ?? preset?.crop ?? "limit";
  const gravity = options?.gravity ?? preset?.gravity;
  const aspectRatio = options?.aspectRatio ?? preset?.aspectRatio;
  const isFill = crop === "fill";

  const transforms = ["f_auto", "q_auto:good"];
  if (isFill) {
    transforms.push("dpr_auto", `c_${crop}`);
    if (gravity) transforms.push(`g_${gravity}`);
    if (aspectRatio) transforms.push(`ar_${aspectRatio}`);
    if (options?.width) transforms.push(`w_${options.width}`);
    if (options?.height) transforms.push(`h_${options.height}`);
  } else {
    transforms.push(`c_${crop}`, "dpr_auto");
    if (options?.width) transforms.push(`w_${options.width}`);
    if (options?.height) transforms.push(`h_${options.height}`);
  }

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms.join(",")}/${publicId}`;
}

const STOCK_LISTING =
  "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1600&q=80";

/** Fixture helper: unsplash:<id> or a Cloudinary public_id. Never map a Cloudinary id to Unsplash. */
export function resolveImageSrc(
  publicId: string,
  cloudName?: string,
  options?: { width?: number; height?: number; context?: ListingImageContext },
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
    return cloudinaryUrl(cloudName, publicId, {
      width: options?.width,
      height: options?.height,
      context: options?.context,
    });
  }
  return "";
}
