import mongoose from "mongoose";
import { env } from "../config/env";

let connecting: Promise<typeof mongoose> | null = null;

export async function connectDb(): Promise<typeof mongoose | null> {
  if (!env.mongodbUri) {
    console.warn(
      "[db] MONGODB_URI not set — API will serve shared fixtures. This is a STUB until Atlas credentials arrive.",
    );
    return null;
  }
  if (mongoose.connection.readyState === 1) return mongoose;
  if (!connecting) {
    connecting = mongoose.connect(env.mongodbUri, {
      dbName: "kestrel",
      serverSelectionTimeoutMS: 15000,
    });
  }
  try {
    await connecting;
    console.info("[db] connected to MongoDB");
    return mongoose;
  } catch (err) {
    connecting = null;
    console.error("[db] connection failed", err);
    throw err;
  }
}

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
