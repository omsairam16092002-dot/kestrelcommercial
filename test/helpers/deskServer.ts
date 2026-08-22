import type { Server } from "node:http";
import mongoose from "mongoose";
import { createApp } from "../../backend/src/app";
import { connectDb, isDbConnected } from "../../backend/src/db/mongoose";
import { seedAdminUser } from "../../backend/src/services/seedAdmin";
import { env } from "../../backend/src/config/env";

let server: Server | undefined;
let base = "";

export function apiBase() {
  return base;
}

export async function startDeskServer() {
  try {
    await connectDb();
    await seedAdminUser();
  } catch {
    /* fixture mode */
  }
  await new Promise<void>((resolve) => {
    server = createApp().listen(0, "127.0.0.1", () => {
      const addr = server!.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      base = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
}

export async function stopDeskServer() {
  if (!server) return;
  await new Promise<void>((resolve, reject) => {
    server!.close((err) => (err ? reject(err) : resolve()));
  });
  server = undefined;
  base = "";
  if (mongoose.connection.readyState) await mongoose.disconnect();
}

export function cookiesFrom(res: Response, prev = "") {
  const jar = new Map(
    prev
      .split(";")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const i = p.indexOf("=");
        return [p.slice(0, i), p.slice(i + 1)] as [string, string];
      }),
  );
  const set = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  for (const c of set) {
    const pair = c.split(";")[0] ?? "";
    const i = pair.indexOf("=");
    if (i > 0) jar.set(pair.slice(0, i), pair.slice(i + 1));
  }
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

export async function apiJson(path: string, init?: RequestInit) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

export async function deskLogin() {
  if (!isDbConnected() || !env.adminSeedPassword) {
    return null;
  }
  const login = await apiJson("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: env.adminSeedEmail,
      password: env.adminSeedPassword,
    }),
  });
  if (login.res.status !== 200) return null;
  const cookie = cookiesFrom(login.res);
  return { headers: { Cookie: cookie } as Record<string, string> };
}

export function mongoReady() {
  return isDbConnected() && Boolean(env.adminSeedPassword);
}
