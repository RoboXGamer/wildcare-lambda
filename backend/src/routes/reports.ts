import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { report } from "../db/schema.js";
import { auth } from "../auth.js";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const reportsApp = new Hono();
const s3 = new S3Client({ region: process.env.AWS_REGION || "ap-south-1" });
const BUCKET = process.env.S3_BUCKET_NAME || "wildcare-photos-dev";

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
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: { message: "Login karo pehle" } }, 401);

  const rows = await db.select().from(report).orderBy(desc(report.createdAt)).limit(100);
  const data = await Promise.all(
    rows.map(async (item) => ({
      ...item,
      photoUrl: item.photoS3Key
        ? await getSignedUrl(
            s3,
            new GetObjectCommand({ Bucket: BUCKET, Key: item.photoS3Key }),
            { expiresIn: 900 }
          )
        : null,
    }))
  );
  return c.json({ data });
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
