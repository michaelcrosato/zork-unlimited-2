import { LlmClient } from "./llm/client.js";
import { PlaytestLogEntry } from "./playtester.js";

export type BugDiagnosis = {
  issue_identified: boolean;
  diagnosis: string;
  severity: "low" | "medium" | "high";
  recommendation: string;
};

/**
 * AI Debugger Agent analyzes playtest event histories and traces to diagnose design flaws or logic bugs.
 */
export async function diagnosePlaytest(options: {
  client: LlmClient;
  logs: PlaytestLogEntry[];
  seed?: number;
}): Promise<BugDiagnosis> {
  const system = `You are a professional game debugger. Review the playtest logs to identify structural bugs, soft-locks, or poor user experience.`;
  const schema = {
    type: "object",
    properties: {
      issue_identified: { type: "boolean" },
      diagnosis: { type: "string" },
      severity: { type: "string", enum: ["low", "medium", "high"] },
      recommendation: { type: "string" },
    },
    required: ["issue_identified", "diagnosis", "severity", "recommendation"],
  };

  return options.client.completeJson<BugDiagnosis>({
    role: "debugger",
    system,
    input: { logs: options.logs },
    schema,
    seed: options.seed,
  });
}
