import bcrypt from "bcryptjs";
import { AGENCY } from "@kestrel/shared";
import { env } from "../config/env";
import { isDbConnected } from "../db/mongoose";
import { UserModel } from "../models/User";
import { AgentModel } from "../models/Agent";

export async function seedAdminUser() {
  if (!isDbConnected()) return;
  await AgentModel.updateMany({ phone: /0456/ }, { $set: { phone: AGENCY.phone } });
  const password = env.adminSeedPassword;
  if (!password) {
    console.warn("[auth] ADMIN_SEED_PASSWORD not set — skip admin seed.");
    return;
  }
  const email = env.adminSeedEmail.toLowerCase();
  const existing = await UserModel.findOne({ email });
  if (existing) {
    if (!existing.passwordHash) {
      existing.passwordHash = await bcrypt.hash(password, 12);
      await existing.save();
    }
    return;
  }
  await UserModel.create({
    email,
    name: "Jignesh Jhanjaria",
    role: "admin",
    passwordHash: await bcrypt.hash(password, 12),
  });
  console.info(`[auth] seeded desk user ${email}`);
}
