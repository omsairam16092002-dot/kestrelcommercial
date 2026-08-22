import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/about",
  "/contact",
  "/services",
  "/sell",
  "/investing",
  "/privacy",
  "/properties",
  "/properties/commercial",
  "/properties/residential",
  "/properties/development-sites",
];

export async function POST() {
  const desk = cookies().get("kestrel_desk")?.value;
  if (!desk) {
    return NextResponse.json({ error: "Sign in to the desk." }, { status: 401 });
  }
  for (const path of PUBLIC_PATHS) {
    revalidatePath(path);
  }
  revalidatePath("/listing/[slug]", "page");
  return NextResponse.json({ ok: true, revalidated: PUBLIC_PATHS.length + 1 });
}
