import path from "node:path";

function str(name: string, fallback?: string) {
  const v = process.env[name];
  if (v === undefined || v === "") {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing env ${name}`);
  }
  return v;
}

export const env = {
  get storageDriver(): "local" | "r2" {
    return (process.env.STORAGE_DRIVER as "local" | "r2") || "local";
  },
  get dataDir() {
    return path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.DATA_DIR || "data");
  },
  get dbUrl() {
    return process.env.DATABASE_URL || `file:${path.join(this.dataDir, "printly.db")}`;
  },
  get dbAuthToken() {
    return process.env.DATABASE_AUTH_TOKEN;
  },
  get adminPassword() {
    return str("ADMIN_PASSWORD", "print");
  },
  get sessionSecret() {
    return str("SESSION_SECRET", "dev-only-change-me-dev-only-change-me");
  },
  get r2() {
    return {
      accountId: str("R2_ACCOUNT_ID", ""),
      accessKeyId: str("R2_ACCESS_KEY_ID", ""),
      secretAccessKey: str("R2_SECRET_ACCESS_KEY", ""),
      bucket: str("R2_BUCKET", ""),
      publicBase: str("R2_PUBLIC_BASE", ""), // 例如 https://pub-xxxx.r2.dev 或自訂網域
    };
  },
  get siteUrl() {
    return process.env.SITE_URL || "http://localhost:3000";
  },
};
