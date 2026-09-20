import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db/index.js";

// Mobile se seedha account creation isi se hoga — email+password.
// Session cookie me rahega, dashboard/mobile dono `fetch(..., { credentials: 'include' })` se chalenge.

const FRONTEND_URLS = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((s) => s.trim().replace(/\/+$/, ""))
  .filter(Boolean);
const LAMBDA_URL =
  "https://hnhgrqhm2xjl2amch5o6i3ddqe0orsoe.lambda-url.ap-south-1.on.aws";
const AUTH_BASE_URL =
  process.env.BETTER_AUTH_URL ||
  (process.env.AWS_LAMBDA_FUNCTION_NAME ? LAMBDA_URL : "http://localhost:3000");
// Dashboard and Capacitor call the Lambda from another site, so Better Auth's
// default SameSite=Lax cookie would be dropped on authenticated API requests.
// Keep production safe by default; local HTTP-only backend development can opt
// out explicitly with BETTER_AUTH_INSECURE_COOKIES=true.
const useSecureCookies = process.env.BETTER_AUTH_INSECURE_COOKIES !== "true";

export const auth = betterAuth({
  baseURL: AUTH_BASE_URL,
  secret: process.env.BETTER_AUTH_SECRET || "dev-secret-change-me",
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  trustedOrigins: [
    "http://localhost:5000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost",
    "https://localhost",
    "capacitor://localhost",
    ...FRONTEND_URLS,
  ],
  advanced: {
    useSecureCookies,
    defaultCookieAttributes: {
      httpOnly: true,
      secure: useSecureCookies,
      sameSite: useSecureCookies ? "none" : "lax",
      path: "/",
    },
  },
});
