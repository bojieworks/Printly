import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import type { PrintSpec } from "@/lib/print-spec";

export const albums = sqliteTable("albums", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  subtitleEn: text("subtitle_en").notNull().default(""),
  date: text("date").notNull(), // YYYY-MM-DD
  story: text("story").notNull().default(""),
  visible: integer("visible", { mode: "boolean" }).notNull().default(false),
  coverPhotoId: text("cover_photo_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const photos = sqliteTable("photos", {
  id: text("id").primaryKey(),
  albumId: text("album_id").notNull(),
  frameNo: text("frame_no").notNull(), // 03A
  originalKey: text("original_key").notNull(),
  originalName: text("original_name").notNull(),
  originalBytes: integer("original_bytes").notNull(),
  originalFormat: text("original_format").notNull(),
  sha256: text("sha256").notNull(),
  width: integer("width").notNull(), // 已套用 Exif 方向
  height: integer("height").notNull(),
  takenAt: text("taken_at"),
  derivatives: text("derivatives", { mode: "json" }).$type<Record<string, string>>().notNull(), // {"480": key, ...}
  caption: text("caption").notNull().default(""),
  layout: text("layout").$type<"full" | "half" | "tall">().notNull().default("full"),
  focalX: integer("focal_x").notNull().default(50), // 0–100
  focalY: integer("focal_y").notNull().default(50),
  visible: integer("visible", { mode: "boolean" }).notNull().default(true),
  sort: integer("sort").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  shortCode: text("short_code").notNull().unique(), // 2026-1114-07
  albumId: text("album_id").notNull(),
  photoId: text("photo_id").notNull(),
  spec: text("spec", { mode: "json" }).$type<PrintSpec>().notNull(),
  effectiveW: integer("effective_w").notNull(),
  effectiveH: integer("effective_h").notNull(),
  guestName: text("guest_name").notNull(),
  note: text("note").notNull().default(""),
  deviceHint: text("device_hint").notNull().default(""),
  status: text("status").$type<"new" | "printed" | "delivered">().notNull().default("new"),
  printKey: text("print_key"),
  printGeneratedAt: text("print_generated_at"),
  createdAt: text("created_at").notNull(),
  printedAt: text("printed_at"),
  deliveredAt: text("delivered_at"),
});

export const uploads = sqliteTable("uploads", {
  id: text("id").primaryKey(),
  albumId: text("album_id").notNull(),
  key: text("key").notNull(),
  name: text("name").notNull(),
  contentType: text("content_type").notNull(),
  bytes: integer("bytes").notNull(),
  status: text("status").$type<"pending" | "done" | "failed">().notNull().default("pending"),
  error: text("error"),
  photoId: text("photo_id"),
  createdAt: text("created_at").notNull(),
});

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(), // 永遠是 1
  studioName: text("studio_name").notNull().default("Jay's Print Room"),
  stampChar: text("stamp_char").notNull().default("傑"),
  successStory: text("success_story").notNull().default("我會用 Canon SELPHY 印在 100 × 148 mm 的相紙上，印好之後拿給你。"),
  calibration: text("calibration", { mode: "json" }).$type<{ top: number; right: number; bottom: number; left: number } | null>(),
  paperColors: text("paper_colors", { mode: "json" }).$type<Record<string, string> | null>(),
  finishEnabled: integer("finish_enabled", { mode: "boolean" }).notNull().default(true),
  checklist: text("checklist", { mode: "json" }).$type<boolean[]>().notNull().default([]),
  loginFails: integer("login_fails").notNull().default(0),
  loginLockedUntil: text("login_locked_until"),
});

export type Album = typeof albums.$inferSelect;
export type Photo = typeof photos.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Upload = typeof uploads.$inferSelect;
export type Settings = typeof settings.$inferSelect;
