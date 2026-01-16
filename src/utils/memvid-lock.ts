import lockfile from "proper-lockfile";
import { mkdir, open } from "node:fs/promises";
import { dirname } from "node:path";

const LOCK_OPTIONS = {
  stale: 30000,
  retries: {
    retries: 1000,
    minTimeout: 5,
    maxTimeout: 50,
  },
} as const;

export async function withMemvidLock<T>(
  lockPath: string,
  fn: () => Promise<T>
): Promise<T> {
  await mkdir(dirname(lockPath), { recursive: true });
  const handle = await open(lockPath, "a");
  await handle.close();

  const release = await lockfile.lock(lockPath, LOCK_OPTIONS);
  try {
    return await fn();
  } finally {
    await release();
  }
}
