import ws from "ws";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema.js";
import * as authSchema from "./auth-schema.js";

// Node me WebSocket driver chahiye (better-auth isi ke saath sahi chalta hai).
// Lambda me pooled URL use karo — connection limit nahi phatega.
neonConfig.webSocketConstructor = ws;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL!,
});

export const db = drizzle(pool, { schema: { ...schema, ...authSchema } });
