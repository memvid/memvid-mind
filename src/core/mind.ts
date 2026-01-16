/**
 * Memvid Mind - Core Engine
 *
 * The brain behind Claude's persistent memory.
 * Stores everything in ONE portable .memvid file.
 */

// Use dynamic import to allow smart-install to run first
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Memvid = any;

import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { mkdir } from "node:fs/promises";
import {
  type Observation,
  type ObservationType,
  type SessionSummary,
  type InjectedContext,
  type MindConfig,
  type MindStats,
  type MemorySearchResult,
  DEFAULT_CONFIG,
} from "../types.js";
import { generateId, estimateTokens } from "../utils/helpers.js";
import { withMemvidLock } from "../utils/memvid-lock.js";

// Lazy-loaded SDK functions
let sdkLoaded = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let use: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let create: any;

async function loadSDK(): Promise<void> {
  if (sdkLoaded) return;
  const sdk = await import("@memvid/sdk");
  use = sdk.use;
  create = sdk.create;
  sdkLoaded = true;
}

/**
 * Mind - Claude's portable memory engine
 *
 * @example
 * ```typescript
 * const mind = await Mind.open();
 * await mind.remember({
 *   type: "decision",
 *   summary: "Chose React over Vue for frontend",
 *   content: "Decision rationale: team familiarity, ecosystem..."
 * });
 *
 * const context = await mind.getContext("authentication");
 * ```
 */
export class Mind {
  private memvid: Memvid;
  private config: MindConfig;
  private sessionId: string;
  private initialized = false;

  private constructor(memvid: Memvid, config: MindConfig) {
    this.memvid = memvid;
    this.config = config;
    this.sessionId = generateId();
  }

  /**
   * Open or create a Mind instance
   */
  static async open(configOverrides: Partial<MindConfig> = {}): Promise<Mind> {
    // Load SDK dynamically (allows smart-install to run first)
    await loadSDK();

    const config = { ...DEFAULT_CONFIG, ...configOverrides };

    // Resolve path relative to project dir (use CLAUDE_PROJECT_DIR if available)
    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const memoryPath = resolve(projectDir, config.memoryPath);
    const memoryDir = dirname(memoryPath);

    // Ensure directory exists
    await mkdir(memoryDir, { recursive: true });

    // Open or create the memvid file
    let memvid: Memvid;
    const MAX_FILE_SIZE_MB = 100; // Files over 100MB are likely corrupted
    const lockPath = `${memoryPath}.lock`;

    await withMemvidLock(lockPath, async () => {
      if (!existsSync(memoryPath)) {
        memvid = await create(memoryPath, "basic");
        return;
      }

      // Check file size - very large files are likely corrupted and will hang
      const { statSync, renameSync, unlinkSync } = await import("node:fs");
      const fileSize = statSync(memoryPath).size;
      const fileSizeMB = fileSize / (1024 * 1024);

      if (fileSizeMB > MAX_FILE_SIZE_MB) {
        console.error(`[memvid-mind] Memory file too large (${fileSizeMB.toFixed(1)}MB), likely corrupted. Creating fresh memory...`);
        const backupPath = `${memoryPath}.backup-${Date.now()}`;
        try { renameSync(memoryPath, backupPath); } catch { /* ignore */ }
        memvid = await create(memoryPath, "basic");
        return;
      }

      try {
        memvid = await use("basic", memoryPath);
      } catch (openError: unknown) {
        const errorMessage = openError instanceof Error ? openError.message : String(openError);
        // Handle corrupted or incompatible memory files
        if (errorMessage.includes("Deserialization") ||
            errorMessage.includes("UnexpectedVariant") ||
            errorMessage.includes("Invalid") ||
            errorMessage.includes("corrupt")) {
          console.error("[memvid-mind] Memory file corrupted, creating fresh memory...");
          const backupPath = `${memoryPath}.backup-${Date.now()}`;
          try {
            renameSync(memoryPath, backupPath);
          } catch {
            try { unlinkSync(memoryPath); } catch { /* ignore */ }
          }
          memvid = await create(memoryPath, "basic");
          return;
        }
        throw openError;
      }
    });

    const mind = new Mind(memvid, config);
    mind.initialized = true;

    if (config.debug) {
      console.error(`[memvid-mind] Opened: ${memoryPath}`);
    }

    return mind;
  }

  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    const memoryPath = this.getMemoryPath();
    const lockPath = `${memoryPath}.lock`;
    return withMemvidLock(lockPath, fn);
  }

  /**
   * Remember an observation
   */
  async remember(input: {
    type: ObservationType;
    summary: string;
    content: string;
    tool?: string;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    const observation: Observation = {
      id: generateId(),
      timestamp: Date.now(),
      type: input.type,
      tool: input.tool,
      summary: input.summary,
      content: input.content,
      metadata: {
        ...input.metadata,
        sessionId: this.sessionId,
      },
    };

    const frameId = await this.withLock(async () => {
      return this.memvid.put({
        title: `[${observation.type}] ${observation.summary}`,
        label: observation.type,
        text: observation.content,
        metadata: {
          observationId: observation.id,
          timestamp: observation.timestamp,
          tool: observation.tool,
          sessionId: this.sessionId,
          ...observation.metadata,
        },
        tags: [observation.type, observation.tool].filter(Boolean) as string[],
      });
    });

    if (this.config.debug) {
      console.error(`[memvid-mind] Remembered: ${observation.summary}`);
    }

    return frameId;
  }

  /**
   * Search memories by query (uses fast lexical search)
   */
  async search(query: string, limit = 10): Promise<MemorySearchResult[]> {
    return this.withLock(async () => {
      return this.searchUnlocked(query, limit);
    });
  }

  private async searchUnlocked(query: string, limit: number): Promise<MemorySearchResult[]> {
    const results = await this.memvid.find(query, { k: limit, mode: "lex" });

    return (results.frames || []).map((frame: any) => ({
      observation: {
        id: frame.metadata?.observationId || frame.frame_id,
        timestamp: frame.metadata?.timestamp || 0,
        type: frame.label as ObservationType,
        tool: frame.metadata?.tool,
        summary: frame.title?.replace(/^\[.*?\]\s*/, "") || "",
        content: frame.text || "",
        metadata: frame.metadata,
      },
      score: frame.score || 0,
      snippet: frame.snippet || frame.text?.slice(0, 200) || "",
    }));
  }

  /**
   * Ask the memory a question (uses fast lexical search)
   */
  async ask(question: string): Promise<string> {
    return this.withLock(async () => {
      const result = await this.memvid.ask(question, { k: 5, mode: "lex" });
      return result.answer || "No relevant memories found.";
    });
  }

  /**
   * Get context for session start
   */
  async getContext(query?: string): Promise<InjectedContext> {
    return this.withLock(async () => {
      // Get recent observations via timeline
      const timeline = await this.memvid.timeline({
        limit: this.config.maxContextObservations,
        reverse: true,
      });

      // SDK returns array directly or { frames: [...] }
      const frames = Array.isArray(timeline) ? timeline : (timeline.frames || []);

      const recentObservations: Observation[] = frames.map(
        (frame: any) => {
          // Get timestamp - SDK returns seconds, convert to milliseconds if needed
          let ts = frame.metadata?.timestamp || frame.timestamp || 0;
          // If timestamp looks like seconds (before year 2100 in seconds), convert to ms
          if (ts > 0 && ts < 4102444800) {
            ts = ts * 1000;
          }
          return {
            id: frame.metadata?.observationId || frame.frame_id,
            timestamp: ts,
            type: (frame.label || frame.metadata?.type || "observation") as ObservationType,
            tool: frame.metadata?.tool,
            summary: frame.title?.replace(/^\[.*?\]\s*/, "") || frame.preview?.slice(0, 100) || "",
            content: frame.text || frame.preview || "",
            metadata: frame.metadata,
          };
        }
      );

      // Get relevant memories if query provided
      let relevantMemories: Observation[] = [];
      if (query) {
        const searchResults = await this.searchUnlocked(query, 10);
        relevantMemories = searchResults.map((r) => r.observation);
      }

      // Build context with token limit
      const contextParts: string[] = [];
      let tokenCount = 0;

      // Add recent observations
      for (const obs of recentObservations) {
        const text = `[${obs.type}] ${obs.summary}`;
        const tokens = estimateTokens(text);
        if (tokenCount + tokens > this.config.maxContextTokens) break;
        contextParts.push(text);
        tokenCount += tokens;
      }

      return {
        recentObservations,
        relevantMemories,
        sessionSummaries: [], // TODO: Implement session summaries
        tokenCount,
      };
    });
  }

  /**
   * Save a session summary
   */
  async saveSessionSummary(summary: {
    keyDecisions: string[];
    filesModified: string[];
    summary: string;
  }): Promise<string> {
    const sessionSummary: SessionSummary = {
      id: this.sessionId,
      startTime: Date.now() - 3600000, // Approximate
      endTime: Date.now(),
      observationCount: 0, // TODO: Track this
      keyDecisions: summary.keyDecisions,
      filesModified: summary.filesModified,
      summary: summary.summary,
    };

    return this.withLock(async () => {
      return this.memvid.put({
        title: `Session Summary: ${new Date().toISOString().split("T")[0]}`,
        label: "session",
        text: JSON.stringify(sessionSummary, null, 2),
        metadata: sessionSummary as unknown as Record<string, unknown>,
        tags: ["session", "summary"],
      });
    });
  }

  /**
   * Get memory statistics
   */
  async stats(): Promise<MindStats> {
    return this.withLock(async () => {
      const stats = await this.memvid.stats();
      const timeline = await this.memvid.timeline({ limit: 1, reverse: false });
      const recentTimeline = await this.memvid.timeline({ limit: 1, reverse: true });

      // SDK returns array directly or { frames: [...] }
      const oldestFrames = Array.isArray(timeline) ? timeline : (timeline.frames || []);
      const newestFrames = Array.isArray(recentTimeline) ? recentTimeline : (recentTimeline.frames || []);

      return {
        totalObservations: (stats.frame_count as number) || 0,
        totalSessions: 0, // TODO: Count unique sessions
        oldestMemory: (oldestFrames[0] as any)?.metadata?.timestamp || (oldestFrames[0] as any)?.timestamp || 0,
        newestMemory: (newestFrames[0] as any)?.metadata?.timestamp || (newestFrames[0] as any)?.timestamp || 0,
        fileSize: (stats.size_bytes as number) || 0,
        topTypes: {} as Record<ObservationType, number>, // TODO: Aggregate
      };
    });
  }

  /**
   * Get the session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get the memory file path
   */
  getMemoryPath(): string {
    return resolve(process.cwd(), this.config.memoryPath);
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Singleton instance for hooks
let mindInstance: Mind | null = null;

/**
 * Get or create the Mind singleton
 */
export async function getMind(config?: Partial<MindConfig>): Promise<Mind> {
  if (!mindInstance) {
    mindInstance = await Mind.open(config);
  }
  return mindInstance;
}

/**
 * Reset the Mind singleton (for testing)
 */
export function resetMind(): void {
  mindInstance = null;
}
