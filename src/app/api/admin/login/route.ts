import { z } from "zod";
import { eq } from "drizzle-orm";
import { ready, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { createSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { handler, parseBody, fail, json } from "@/lib/api";

export const dynamic = "force-dynamic";
const MAX = 5;
const LOCK_MIN = 15;

export const POST = handler(async (req) => {
  const { password } = await parseBody(req, z.object({ password: z.string() }));
  const d = await ready();
  const st = await d.select().from(schema.settings).where(eq(schema.settings.id, 1)).get();
  const lockedUntil = st?.loginLockedUntil ? new Date(st.loginLockedUntil).getTime() : 0;
  if (lockedUntil > Date.now()) {
    return fail(`錯了 ${MAX} 次，${Math.ceil((lockedUntil - Date.now()) / 60000)} 分鐘後再試。`, 429);
  }
  if (password !== env.adminPassword) {
    const fails = (lockedUntil > 0 && lockedUntil <= Date.now() ? 0 : st?.loginFails ?? 0) + 1;
    const lock = fails >= MAX ? new Date(Date.now() + LOCK_MIN * 60000).toISOString() : null;
    await d.update(schema.settings).set({ loginFails: fails, loginLockedUntil: lock }).where(eq(schema.settings.id, 1));
    return fail(lock ? `錯了 ${MAX} 次，${LOCK_MIN} 分鐘後再試。` : `密碼不對。還可以試 ${MAX - fails} 次。`, 401);
  }
  await d.update(schema.settings).set({ loginFails: 0, loginLockedUntil: null }).where(eq(schema.settings.id, 1));
  const token = await createSession();
  const res = json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
});
