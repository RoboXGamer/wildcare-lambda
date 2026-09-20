import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { report } from "../db/schema.js";
import { auth } from "../auth.js";

export const reportsApp = new Hono();

// POST /reports — mobile se aayega, Neon me save hoga
reportsApp.post("/", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: { message: "Login karo pehle" } }, 401);

  const body = await c.req.json();
  const [row] = await db
    .insert(report)
    .values({
      userId: session.user.id,
      incidentType: body.incidentType || "Animal needs help",
      description: body.description || null,
      latitude: body.latitude || null,
      longitude: body.longitude || null,
      locationLabel: body.locationLabel || null,
      photoS3Key: body.photoS3Key || null,
      status: "New",
    })
    .returning();

  return c.json({ data: row }, 201);
});

// GET /reports — dashboard pe list dikhegi
reportsApp.get("/", async (c) => {
  const rows = await db.select().from(report).orderBy(desc(report.createdAt)).limit(100);
  return c.json({ data: rows });
});

// PATCH /reports/:id — dashboard se Accept/Resolve
reportsApp.patch("/:id", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: { message: "Login karo pehle" } }, 401);

  const id = c.req.param("id");
  const body = await c.req.json();
  const [row] = await db
    .update(report)
    .set({ status: body.status || "In Progress" })
    .where(eq(report.id, id))
    .returning();

  return c.json({ data: row });
});
