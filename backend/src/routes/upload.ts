import { Hono } from "hono";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { auth } from "../auth.js";

const s3 = new S3Client({ region: process.env.AWS_REGION || "ap-southeast-1" });
const BUCKET = process.env.S3_BUCKET_NAME || "wildcare-photos-dev";

export const uploadApp = new Hono();

// POST /upload/url — photo S3 me save karne ke liye signed URL dega
// body: { fileName, contentType }
uploadApp.post("/url", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: { message: "Login karo pehle" } }, 401);

  const { fileName, contentType } = await c.req.json();
  const safe = String(fileName || "photo.jpg").replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `reports/${session.user.id}/${randomUUID()}-${safe}`;

  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType || "image/jpeg" }),
    { expiresIn: 900 }
  );

  return c.json({ data: { uploadUrl: url, s3Key: key } });
});
