import { promises as fs } from "fs";
import path from "path";

// Tiny JSON-file store under ./data (gitignored). Good enough for a personal,
// single-user dashboard; swap for SQLite/Postgres if you deploy it.
const DATA_DIR = path.join(process.cwd(), "data");

export async function readJson<T>(name: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(path.join(DATA_DIR, name), "utf8")) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(name: string, value: unknown): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const file = path.join(DATA_DIR, name);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), { mode: 0o600 });
  await fs.rename(tmp, file);
}
