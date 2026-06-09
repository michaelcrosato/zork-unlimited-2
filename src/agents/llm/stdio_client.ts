import { LlmClient } from "./client.js";
import { createInterface } from "node:readline";

/**
 * An LLM client that delegates calls to stdout/stdin.
 * Used for actual local playtesting where the parent agent or a subagent
 * acts as the LLM decider, bypassing remote APIs.
 */
export class StdioLlmClient implements LlmClient {
  private readLineFromStdin(): Promise<string> {
    return new Promise((resolve) => {
      const rl = createInterface({
        input: process.stdin,
      });
      rl.once("line", (line) => {
        rl.close();
        resolve(line);
      });
    });
  }

  async completeJson<T>(request: {
    role: "writer" | "adapter" | "playtester" | "debugger" | "fixer" | "orchestrator";
    system: string;
    input: unknown;
    schema: unknown;
    seed?: number;
  }): Promise<T> {
    // Write request to stdout with a clear prefix marker
    const payload = JSON.stringify({
      role: request.role,
      system: request.system,
      input: request.input,
      schema: request.schema,
      seed: request.seed,
    });
    
    console.log(`[LLM_REQUEST] ${payload}`);

    // Wait for the decision to be typed into stdin
    const rawResponse = await this.readLineFromStdin();
    
    try {
      return JSON.parse(rawResponse) as T;
    } catch (err: any) {
      throw new Error(`StdioLlmClient failed to parse stdin JSON response: ${err.message}. Raw input: ${rawResponse}`);
    }
  }
}
