import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const desk = cookies().get("kestrel_desk")?.value;
  if (!desk) {
    return NextResponse.json({ error: "Sign in to the desk." }, { status: 401 });
  }
  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/search");
  return NextResponse.json({ ok: true });
}
