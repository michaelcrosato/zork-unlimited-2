/**
 * @module playtest/mcp_client
 *
 * Lightweight MCP JSON-RPC client that manages a subprocess running the
 * AdventureForge MCP server and communicates via stdin/stdout.
 *
 * The client spawns `npx tsx src/bin/mcp-server.ts`, performs the MCP
 * protocol handshake, and exposes typed methods for each game tool.
 *
 * @example
 * ```ts
 * const client = new McpGameClient('my-session');
 * await client.connect();
 * const adventures = await client.listAdventures();
 * const intro = await client.startGame('chapel_pack_v1');
 * const result = await client.executeAction('go north');
 * await client.disconnect();
 * ```
 */

import { ChildProcess, spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

/** Shape of an adventure pack entry returned by `list_adventures`. */
export interface AdventurePack {
  id: string;
  title: string;
  type: string;
  path: string;
}

/** Result of executing a player action. */
export interface ActionResult {
  /** The observation / narration text returned by the server. */
  text: string;
  /** Whether the MCP server flagged this response as an error. */
  isError: boolean;
}

/** Shape of a raw MCP JSON-RPC response. */
interface McpResponse {
  jsonrpc: string;
  id: number;
  result?: {
    content?: Array<{ type: string; text: string }>;
    isError?: boolean;
    [key: string]: unknown;
  };
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/** Default request timeout in milliseconds (90 seconds). */
const DEFAULT_TIMEOUT_MS = 90_000;

/**
 * Resolve the project root directory from this file's location.
 *
 * This file lives at `src/playtest/mcp_client.ts`, so the project root
 * is two directories up from `__dirname`.
 */
function getProjectRoot(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  return resolve(__dirname, "..", "..");
}

/**
 * A lightweight MCP JSON-RPC client that spawns the AdventureForge MCP
 * server as a subprocess and communicates over stdio.
 *
 * Lifecycle:
 * 1. Construct with a session ID.
 * 2. Call {@link connect} to spawn the server and perform the MCP handshake.
 * 3. Use game methods ({@link listAdventures}, {@link startGame}, etc.).
 * 4. Call {@link disconnect} to kill the subprocess and clean up.
 */
export class McpGameClient {
  private server: ChildProcess | null = null;
  private messageId = 1;
  private pendingRequests = new Map<number, { resolve: (res: McpResponse) => void; reject: (err: Error) => void }>();
  private buffer = "";
  private sessionId: string;
  private ready = false;
  private stderrLog: string[] = [];
  private timeoutMs: number;

  /**
   * Create a new MCP game client.
   *
   * @param sessionId - Session identifier sent with every tool call.
   *   Defaults to `'blind-playtest'`.
   * @param timeoutMs - Request timeout in milliseconds. Defaults to 30 000.
   */
  constructor(sessionId: string = "blind-playtest", timeoutMs: number = DEFAULT_TIMEOUT_MS) {
    this.sessionId = sessionId;
    this.timeoutMs = timeoutMs;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Start the MCP server subprocess and perform the protocol handshake.
   *
   * After this resolves the client is ready to call game tools.
   *
   * @throws {Error} If the server process fails to start or the handshake
   *   times out.
   */
  async connect(): Promise<void> {
    if (this.ready) {
      throw new Error("McpGameClient is already connected. Call disconnect() first.");
    }

    const projectRoot = getProjectRoot();
    const distScript = resolve(projectRoot, "dist/bin/mcp-server.js");
    const srcScript = resolve(projectRoot, "src/bin/mcp-server.ts");

    const isTs = import.meta.url.endsWith(".ts") || import.meta.url.includes("/src/");
    if (existsSync(distScript) && !isTs) {
      this.server = spawn("node", [distScript], {
        env: { ...process.env, PAGER: "cat" },
        cwd: projectRoot,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } else {
      this.server = spawn("node", ["--import", "tsx", srcScript], {
        env: { ...process.env, PAGER: "cat" },
        cwd: projectRoot,
        stdio: ["pipe", "pipe", "pipe"],
      });
    }

    // Wire up stdout JSON-RPC message parser.
    this.setupStdoutParser();

    // Collect stderr for debugging.
    this.server.stderr?.on("data", (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) {
        this.stderrLog.push(msg);
      }
    });

    // Handle unexpected process exit before we're done.
    this.server.on("error", (err) => {
      this.rejectAllPending(new Error(`MCP server process error: ${err.message}`));
    });

    this.server.on("close", (code) => {
      if (this.ready) {
        // Unexpected exit while we thought we were connected.
        this.rejectAllPending(new Error(`MCP server exited unexpectedly with code ${code ?? "unknown"}`));
        this.ready = false;
      }
    });

    // MCP protocol handshake.
    await this.sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "afk-mcp-playtest-client", version: "1.0.0" },
    });
    this.sendNotification("notifications/initialized");

    this.ready = true;
  }

  /**
   * List available adventure packs discovered by the server.
   *
   * @returns Array of adventure pack metadata objects.
   */
  async listAdventures(): Promise<AdventurePack[]> {
    this.ensureReady();

    const response = await this.callTool("list_adventures", {});
    const text = this.extractText(response);

    try {
      return JSON.parse(text) as AdventurePack[];
    } catch {
      throw new Error(`Failed to parse list_adventures response: ${text}`);
    }
  }

  /**
   * Start a new game with the given adventure pack.
   *
   * @param adventureId - The pack's metadata ID (e.g. `'chapel_pack_v1'`),
   *   or a relative file path.
   * @param seed - Optional seed for deterministic randomness.
   * @returns The initial observation text.
   */
  async startGame(adventureId: string, seed?: number): Promise<string> {
    this.ensureReady();

    const args: Record<string, unknown> = {
      adventureId,
      sessionId: this.sessionId,
    };
    if (seed !== undefined) {
      args.seed = seed;
    }

    const response = await this.callTool("start_new_game", args);
    return this.extractText(response);
  }

  /**
   * Get the current observation (scene/room description, inventory, etc.).
   *
   * @returns The formatted observation text.
   */
  async getObservation(): Promise<string> {
    this.ensureReady();

    const response = await this.callTool("get_current_observation", {
      sessionId: this.sessionId,
    });
    return this.extractText(response);
  }

  /**
   * Execute a player action and return the resulting observation.
   *
   * @param action - The command string (e.g. `'go north'`, `'take key'`,
   *   or a CYOA choice number like `'1'`).
   * @returns An {@link ActionResult} with the text and error flag.
   */
  async executeAction(action: string): Promise<ActionResult> {
    this.ensureReady();

    const response = await this.callTool("execute_action", {
      action,
      sessionId: this.sessionId,
    });

    return {
      text: this.extractText(response),
      isError: response.result?.isError === true,
    };
  }

  /**
   * Save the current game state.
   *
   * @returns The serialised save-data JSON string.
   */
  async saveGame(): Promise<string> {
    this.ensureReady();

    const response = await this.callTool("save_game_state", {
      sessionId: this.sessionId,
    });
    return this.extractText(response);
  }

  /**
   * Load a previously saved game state.
   *
   * @param saveData - The serialised JSON string from {@link saveGame}.
   * @returns The observation text after restoring the game.
   */
  async loadGame(saveData: string): Promise<string> {
    this.ensureReady();

    const response = await this.callTool("load_game_state", {
      saveData,
      sessionId: this.sessionId,
    });
    return this.extractText(response);
  }

  /**
   * Check whether the observation text indicates a game-over state.
   *
   * Looks for the `💀☠️ GAME OVER` pattern emitted by the MCP server's
   * `formatObservation` function.
   *
   * @param observationText - The observation text to inspect.
   * @returns `true` if the game is over.
   */
  isGameOver(observationText: string): boolean {
    return observationText.includes("💀☠️ GAME OVER");
  }

  /**
   * Return collected stderr output from the MCP server subprocess.
   *
   * Useful for debugging server-side issues.
   */
  getStderrLog(): string[] {
    return [...this.stderrLog];
  }

  /**
   * Whether the client is currently connected and ready.
   */
  get isConnected(): boolean {
    return this.ready;
  }

  /**
   * Kill the MCP server subprocess and clean up all internal state.
   *
   * Safe to call multiple times — subsequent calls are no-ops.
   */
  async disconnect(): Promise<void> {
    this.ready = false;

    // Reject any still-pending requests.
    this.rejectAllPending(new Error("McpGameClient disconnected"));

    if (this.server) {
      const serverRef = this.server;
      this.server = null;

      // Give the process a moment to exit gracefully, then force-kill.
      const killed = serverRef.kill("SIGTERM");
      if (!killed) {
        // Process may have already exited — that's fine.
        return;
      }

      // Wait briefly for graceful exit, then SIGKILL as fallback.
      await new Promise<void>((resolvePromise) => {
        const timeout = setTimeout(() => {
          try {
            serverRef.kill("SIGKILL");
          } catch {
            // Already dead.
          }
          resolvePromise();
        }, 2_000);

        serverRef.on("close", () => {
          clearTimeout(timeout);
          resolvePromise();
        });
      });
    }

    this.buffer = "";
    this.messageId = 1;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Set up the stdout data handler that buffers incoming bytes and parses
   * complete newline-delimited JSON-RPC messages.
   */
  private setupStdoutParser(): void {
    if (!this.server?.stdout) {
      throw new Error("Server stdout is not available");
    }

    this.server.stdout.on("data", (data: Buffer) => {
      this.buffer += data.toString();

      while (true) {
        const newlineIndex = this.buffer.indexOf("\n");
        if (newlineIndex === -1) break;

        const line = this.buffer.substring(0, newlineIndex).trim();
        this.buffer = this.buffer.substring(newlineIndex + 1);

        if (!line) continue;

        try {
          const response = JSON.parse(line) as McpResponse;
          if (response.id !== undefined) {
            const pending = this.pendingRequests.get(response.id);
            if (pending) {
              this.pendingRequests.delete(response.id);
              pending.resolve(response);
            }
          }
        } catch {
          // Skip lines that aren't valid JSON (e.g. debug output).
        }
      }
    });
  }

  /**
   * Send a JSON-RPC request and wait for the matching response.
   *
   * @param method - The JSON-RPC method name.
   * @param params - The parameters object.
   * @returns The parsed MCP response.
   * @throws {Error} On timeout or if the server returns a JSON-RPC error.
   */
  private sendRequest(method: string, params: Record<string, unknown>): Promise<McpResponse> {
    if (!this.server?.stdin) {
      throw new Error("Server stdin is not available — is the client connected?");
    }

    const id = this.messageId++;
    const request = { jsonrpc: "2.0" as const, id, method, params };

    return new Promise<McpResponse>((resolvePromise, rejectPromise) => {
      // Timeout guard.
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        rejectPromise(new Error(`MCP request timed out after ${this.timeoutMs}ms: ${method} (id=${id})`));
      }, this.timeoutMs);

      this.pendingRequests.set(id, {
        resolve: (res: McpResponse) => {
          clearTimeout(timer);
          if (res.error) {
            rejectPromise(new Error(`MCP JSON-RPC error [${res.error.code}]: ${res.error.message}`));
          } else {
            resolvePromise(res);
          }
        },
        reject: (err: Error) => {
          clearTimeout(timer);
          rejectPromise(err);
        },
      });

      this.server!.stdin!.write(JSON.stringify(request) + "\n");
    });
  }

  /**
   * Send a JSON-RPC notification (a request with no `id`, so no response
   * is expected).
   *
   * @param method - The JSON-RPC method name.
   * @param params - Optional parameters.
   */
  private sendNotification(method: string, params?: Record<string, unknown>): void {
    if (!this.server?.stdin) {
      throw new Error("Server stdin is not available — is the client connected?");
    }

    const notification: Record<string, unknown> = { jsonrpc: "2.0", method };
    if (params !== undefined) {
      notification.params = params;
    }
    this.server.stdin.write(JSON.stringify(notification) + "\n");
  }

  /**
   * Convenience wrapper that calls an MCP tool via `tools/call`.
   *
   * @param toolName - The tool name (e.g. `'execute_action'`).
   * @param args - The tool's argument object.
   * @returns The MCP response.
   */
  private async callTool(toolName: string, args: Record<string, unknown>): Promise<McpResponse> {
    return this.sendRequest("tools/call", { name: toolName, arguments: args });
  }

  /**
   * Extract the first text content block from an MCP tool response.
   *
   * @param response - The raw MCP response.
   * @returns The text string, or an empty string if none is present.
   */
  private extractText(response: McpResponse): string {
    return response.result?.content?.[0]?.text ?? "";
  }

  /**
   * Throw if the client is not connected.
   */
  private ensureReady(): void {
    if (!this.ready) {
      throw new Error("McpGameClient is not connected. Call connect() first.");
    }
  }

  /**
   * Reject all pending request promises with the given error.
   * Used during disconnect or unexpected process exit.
   */
  private rejectAllPending(error: Error): void {
    for (const [id, pending] of this.pendingRequests) {
      pending.reject(error);
      this.pendingRequests.delete(id);
    }
  }
}
