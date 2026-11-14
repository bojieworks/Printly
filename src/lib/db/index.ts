import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { mkdirSync } from "node:fs";
import { env } from "@/lib/env";
import * as schema from "./schema";

const DDL = [
  `CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, title TEXT NOT NULL, subtitle_en TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL, story TEXT NOT NULL DEFAULT '', visible INTEGER NOT NULL DEFAULT 0, cover_photo_id TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY, album_id TEXT NOT NULL, frame_no TEXT NOT NULL, original_key TEXT NOT NULL,
    original_name TEXT NOT NULL, original_bytes INTEGER NOT NULL, original_format TEXT NOT NULL, sha256 TEXT NOT NULL,
    width INTEGER NOT NULL, height INTEGER NOT NULL, taken_at TEXT, derivatives TEXT NOT NULL,
    caption TEXT NOT NULL DEFAULT '', layout TEXT NOT NULL DEFAULT 'full', focal_x INTEGER NOT NULL DEFAULT 50,
    focal_y INTEGER NOT NULL DEFAULT 50, visible INTEGER NOT NULL DEFAULT 1, sort INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS photos_album ON photos(album_id, sort)`,
  `CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY, short_code TEXT NOT NULL UNIQUE, album_id TEXT NOT NULL, photo_id TEXT NOT NULL,
    spec TEXT NOT NULL, effective_w INTEGER NOT NULL, effective_h INTEGER NOT NULL, guest_name TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '', device_hint TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'new',
    print_key TEXT, print_generated_at TEXT, created_at TEXT NOT NULL, printed_at TEXT, delivered_at TEXT)`,
  `CREATE INDEX IF NOT EXISTS orders_status ON orders(status, created_at)`,
  `CREATE TABLE IF NOT EXISTS uploads (
    id TEXT PRIMARY KEY, album_id TEXT NOT NULL, key TEXT NOT NULL, name TEXT NOT NULL, content_type TEXT NOT NULL,
    bytes INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', error TEXT, photo_id TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY, studio_name TEXT NOT NULL DEFAULT 'Jay''s Print Room', stamp_char TEXT NOT NULL DEFAULT '傑',
    success_story TEXT NOT NULL DEFAULT '我會用 Canon SELPHY 印在 100 × 148 mm 的相紙上，印好之後拿給你。',
    calibration TEXT, paper_colors TEXT, finish_enabled INTEGER NOT NULL DEFAULT 1, checklist TEXT NOT NULL DEFAULT '[]',
    login_fails INTEGER NOT NULL DEFAULT 0, login_locked_until TEXT)`,
  `INSERT OR IGNORE INTO settings (id) VALUES (1)`,
];

type DB = ReturnType<typeof drizzle<typeof schema>>;

const g = globalThis as unknown as { __printly_db?: DB; __printly_client?: Client; __printly_ready?: Promise<void> };

function makeClient() {
  const url = env.dbUrl;
  if (url.startsWith("file:")) mkdirSync(env.dataDir, { recursive: true });
  return createClient({ url, authToken: env.dbAuthToken });
}

export function db(): DB {
  if (!g.__printly_db) {
    g.__printly_client = makeClient();
    g.__printly_db = drizzle(g.__printly_client, { schema });
  }
  return g.__printly_db;
}

/** 第一次使用前把表建好。冪等，可在每個請求呼叫。 */
export async function ready() {
  if (!g.__printly_ready) {
    db();
    g.__printly_ready = (async () => {
      for (const sql of DDL) await g.__printly_client!.execute(sql);
    })();
  }
  await g.__printly_ready;
  return db();
}

export { schema };
