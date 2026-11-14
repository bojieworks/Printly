import { promises as fs } from "node:fs";
import path from "node:path";
import { env } from "@/lib/env";
import type { StorageDriver } from "./index";

export class LocalStorage implements StorageDriver {
  readonly kind = "local" as const;
  private root = path.join(env.dataDir, "storage");

  private abs(key: string) {
    const p = path.normalize(path.join(this.root, key));
    if (!p.startsWith(this.root)) throw new Error("bad key");
    return p;
  }
  async put(key: string, body: Buffer) {
    const p = this.abs(key);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, body);
  }
  async get(key: string) {
    return fs.readFile(this.abs(key));
  }
  async exists(key: string) {
    try {
      await fs.access(this.abs(key));
      return true;
    } catch {
      return false;
    }
  }
  async delete(key: string) {
    await fs.rm(this.abs(key), { force: true });
  }
  publicUrl(key: string) {
    return `/media/${key}`;
  }
  async presignPut() {
    return null;
  }
  async presignGet() {
    return null;
  }
}
