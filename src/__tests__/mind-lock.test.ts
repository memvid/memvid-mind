import { describe, it, expect } from "vitest";
import { Mind } from "../core/mind.js";
import { mkdtempSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

function makeTempMemoryPath(): { dir: string; path: string } {
  const dir = mkdtempSync(join(tmpdir(), "claude-brain-lock-"));
  return { dir, path: join(dir, "mind.mv2") };
}

async function writeOnce(memoryPath: string, i: number): Promise<void> {
  const mind = await Mind.open({ memoryPath, debug: false });
  await mind.remember({
    type: "discovery",
    summary: `summary-${i}`,
    content: `content-${i}`,
  });
}

describe("Mind concurrent access", () => {
  it("writes all frames in the happy path (single writer)", async () => {
    const { dir, path } = makeTempMemoryPath();
    try {
      const writes = 5;
      for (let i = 0; i < writes; i++) {
        await writeOnce(path, i);
      }

      const mind = await Mind.open({ memoryPath: path, debug: false });
      const stats = await mind.stats();
      expect(stats.totalObservations).toBe(writes);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("preserves all frames with concurrent writers (edge case)", async () => {
    const { dir, path } = makeTempMemoryPath();
    try {
      const writes = 20;
      const tasks = Array.from({ length: writes }, (_, i) => writeOnce(path, i));
      const results = await Promise.allSettled(tasks);

      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length) {
        throw failed[0].reason;
      }

      const mind = await Mind.open({ memoryPath: path, debug: false });
      const stats = await mind.stats();
      expect(stats.totalObservations).toBe(writes);

      const backups = readdirSync(dir).filter((f) => f.includes(".backup-"));
      expect(backups.length).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 15000);
});
