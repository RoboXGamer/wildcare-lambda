import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth-schema.js";

// ── WildCare report — mobile se aayega, dashboard pe dikhega ──

export const report = pgTable("report", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("userId").references(() => user.id, { onDelete: "set null" }),
  incidentType: text("incidentType").notNull(),
  description: text("description"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  locationLabel: text("locationLabel"),
  photoS3Key: text("photoS3Key"),
  status: text("status").default("New").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
