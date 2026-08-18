import { existsSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { v2 as cloudinary } from "cloudinary";
import { connectDb, isDbConnected } from "../db/mongoose";
import { PropertyModel } from "../models/Property";
import { env } from "../config/env";

const LISTINGS_ROOT = join(process.cwd(), "..", "frontend", "public", "listings");
const CONCURRENCY = 3;
const LIMIT = Number(process.env.CLOUDINARY_UPLOAD_LIMIT ?? "0");

type ImageRow = { publicId: string; isHero?: boolean; alt?: string };

function requireCloudinary() {
  if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
    throw new Error("Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in backend/.env.");
  }
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
}

function localPath(publicId: string) {
  const rel = publicId.slice("local:".length).replace(/^\/+/, "").replace(/\\/g, "/");
  return { rel, file: join(LISTINGS_ROOT, ...rel.split("/")) };
}

function cloudId(rel: string) {
  const noExt = rel.replace(/\.[^.]+$/, "");
  return `${env.cloudinary.folder}/${noExt}`.replace(/\/+/g, "/");
}

async function pool<T>(items: T[], n: number, worker: (item: T) => Promise<void>) {
  let i = 0;
  async function next(): Promise<void> {
    const idx = i;
    i += 1;
    if (idx >= items.length) return;
    await worker(items[idx]);
    await next();
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, () => next()));
}

async function uploadFile(file: string, publicId: string) {
  const size = statSync(file).size;
  const opts = {
    public_id: publicId,
    overwrite: true,
    invalidate: true,
    resource_type: "image" as const,
    use_filename: false,
    unique_filename: false,
  };
  if (size > 9_500_000) {
    return cloudinary.uploader.upload_large(file, { ...opts, chunk_size: 6_000_000 });
  }
  return cloudinary.uploader.upload(file, opts);
}

async function main() {
  requireCloudinary();
  const ping = await cloudinary.api.ping();
  console.info(`Cloudinary ping: ${ping.status ?? "ok"} (${env.cloudinary.cloudName})`);

  await connectDb();
  if (!isDbConnected()) {
    console.error("Mongo is required to rewrite listing image ids.");
    process.exit(1);
  }

  const docs = (await PropertyModel.find({
    $or: [{ "images.publicId": /^local:/ }, { floorplanPublicId: /^local:/ }],
  })
    .select("slug images floorplanPublicId")
    .lean()) as unknown as {
    slug: string;
    images?: ImageRow[];
    floorplanPublicId?: string | null;
  }[];

  type Job = { slug: string; kind: "image" | "floorplan"; index: number; from: string; file: string; to: string };
  const jobs: Job[] = [];
  for (const doc of docs) {
    (doc.images ?? []).forEach((img, index) => {
      if (!img.publicId?.startsWith("local:")) return;
      const { rel, file } = localPath(img.publicId);
      jobs.push({ slug: doc.slug, kind: "image", index, from: img.publicId, file, to: cloudId(rel) });
    });
    if (doc.floorplanPublicId?.startsWith("local:")) {
      const { rel, file } = localPath(doc.floorplanPublicId);
      jobs.push({
        slug: doc.slug,
        kind: "floorplan",
        index: -1,
        from: doc.floorplanPublicId,
        file,
        to: cloudId(rel),
      });
    }
  }

  const unique = new Map<string, Job>();
  for (const job of jobs) {
    if (!unique.has(job.to)) unique.set(job.to, job);
  }
  const uniqueJobs = [...unique.values()];
  const work = LIMIT > 0 ? uniqueJobs.slice(0, LIMIT) : uniqueJobs;
  console.info(`Uploading ${work.length} unique file(s) covering ${jobs.length} listing image(s).`);

  let ok = 0;
  let skipped = 0;
  let failed = 0;
  await pool(work, CONCURRENCY, async (job) => {
    if (!existsSync(job.file) || statSync(job.file).size < 8_000) {
      skipped += 1;
      console.warn(`Missing ${job.from}`);
      return;
    }
    try {
      await uploadFile(job.file, job.to);
      await PropertyModel.updateMany(
        { "images.publicId": job.from },
        { $set: { "images.$[img].publicId": job.to } },
        { arrayFilters: [{ "img.publicId": job.from }] },
      );
      await PropertyModel.updateMany({ floorplanPublicId: job.from }, { $set: { floorplanPublicId: job.to } });
      ok += 1;
      if (ok % 10 === 0 || ok === work.length) console.info(`Uploaded ${ok}/${work.length}`);
    } catch (err) {
      failed += 1;
      const message =
        err && typeof err === "object" && "error" in err
          ? JSON.stringify((err as { error: unknown }).error)
          : err instanceof Error
            ? err.message
            : String(err);
      console.warn(`Fail ${job.from}: ${message}`);
    }
  });

  console.info(`Done. uploaded=${ok} skipped=${skipped} failed=${failed}`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
