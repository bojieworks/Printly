"use client";
import type { PrintSpec } from "@/lib/print-spec";

/** DESIGN_SYSTEM §8.4 — 全部包在 try/catch，失敗時功能照常、只是不記住 */
const PREFIX = "jpr:";

function read<T>(key: string): T | null {
  try {
    const v = localStorage.getItem(PREFIX + key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(PREFIX + key);
    else localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export interface ShelfEntry { code: string; openedAt: string }

export const store = {
  shelf: (): ShelfEntry[] => read<ShelfEntry[]>("shelf") ?? [],
  addToShelf(code: string) {
    const list = store.shelf().filter((e) => e.code !== code);
    list.push({ code, openedAt: new Date().toISOString() });
    write("shelf", list);
  },
  guestName: () => read<string>("guest_name") ?? "",
  setGuestName: (n: string) => write("guest_name", n),
  mode: () => read<"pages" | "sheet">("mode") ?? "pages",
  setMode: (m: "pages" | "sheet") => write("mode", m),
  spec: (code: string, frame: string) => read<PrintSpec>(`spec:${code}:${frame}`),
  setSpec: (code: string, frame: string, s: PrintSpec | null) => write(`spec:${code}:${frame}`, s),
  printed: (code: string): { frame: string; at: string }[] => read(`printed:${code}`) ?? [],
  addPrinted(code: string, frame: string) {
    const list = store.printed(code).filter((e) => e.frame !== frame);
    list.push({ frame, at: new Date().toISOString() });
    write(`printed:${code}`, list);
  },
};

export function deviceHint() {
  try {
    const ua = navigator.userAgent;
    if (/iPhone/.test(ua)) return "iPhone";
    if (/iPad/.test(ua)) return "iPad";
    if (/Android/.test(ua)) return "Android";
    if (/Macintosh/.test(ua)) return "Mac";
    if (/Windows/.test(ua)) return "Windows";
    return "Other";
  } catch {
    return "";
  }
}

export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { ...(init?.json !== undefined ? { "content-type": "application/json" } : {}), ...(init?.headers ?? {}) },
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  return data as T;
}
