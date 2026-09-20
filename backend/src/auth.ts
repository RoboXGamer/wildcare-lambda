import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db/index.js";

// Mobile se seedha account creation isi se hoga — email+password.
// Session cookie me rahega, dashboard/mobile dono `fetch(..., { credentials: 'include' })` se chalenge.

const FRONTEND_URLS = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET || "dev-secret-change-me",
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  trustedOrigins: [
    "http://localhost:5000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    ...FRONTEND_URLS,
  ],
});
