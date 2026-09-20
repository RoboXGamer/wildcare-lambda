import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { handle } from "hono/aws-lambda";
import { serve } from "@hono/node-server";
import { auth } from "./auth.js";
import { reportsApp } from "./routes/reports.js";
import { uploadApp } from "./routes/upload.js";

const app = new Hono();

// Static dashboard/mobile se call aayega.
// FRONTEND_URL env me comma-separated origins do (local + Netlify + Lambda URL),
// taaki redeploy ke bina naye frontend jod sako.
const FRONTEND_URLS = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((s) => s.trim().replace(/\/+$/, ""))
  .filter(Boolean);
const origins = [
  "http://localhost:5000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost",
  "https://localhost",
  "capacitor://localhost",
  ...FRONTEND_URLS,
];
app.use(
  "*",
  cors({
    origin: origins,
    credentials: true,
    allowHeaders: ["Content-Type"],
    allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
    maxAge: 86400,
  })
);

app.get("/health", (c) => c.json({ success: true, data: { status: "ok" } }));

// Better Auth — signup/login/session sab yahi handle karta hai
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// App APIs — Neon me save hoga
app.route("/api/reports", reportsApp);
app.route("/api/upload", uploadApp);

// ── Lambda par yahi chalega (API Gateway HTTP API + Lambda) ──
export const handler = handle(app);

// ── Local me `pnpm dev` se yahi chalega ──
if (process.env.AWS_LAMBDA_FUNCTION_NAME === undefined) {
  serve({ fetch: app.fetch, port: 3000 }, () =>
    console.log("wildcare-lambda running on http://localhost:3000")
  );
}
