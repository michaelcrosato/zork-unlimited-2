export interface LlmClient {
  completeJson<T>(request: {
    role: "writer" | "adapter" | "playtester" | "debugger" | "fixer" | "orchestrator";
    system: string;
    input: unknown;
    schema: unknown;
    seed?: number;
  }): Promise<T>;
}
