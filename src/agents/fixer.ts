import { LlmClient } from "./llm/client.js";
import { BugDiagnosis } from "./debugger.js";

export type ContentFixResult = {
  fixed: boolean;
  fix_layer: "content" | "engine_rule" | "validator";
  applied_patch: string;
  regression_test_name: string;
};

/**
 * AI Fixer Agent proposes and applies patches to resolve identified game-design flaws or soft-locks.
 */
export async function fixIdentifiedBug(options: {
  client: LlmClient;
  diagnosis: BugDiagnosis;
  seed?: number;
}): Promise<ContentFixResult> {
  const system = `You are a software and game design fixer. Propose a specific content fix or schema update to resolve the diagnosed issue.`;
  const schema = {
    type: "object",
    properties: {
      fixed: { type: "boolean" },
      fix_layer: { type: "string", enum: ["content", "engine_rule", "validator"] },
      applied_patch: { type: "string" },
      regression_test_name: { type: "string" },
    },
    required: ["fixed", "fix_layer", "applied_patch", "regression_test_name"],
  };

  return options.client.completeJson<ContentFixResult>({
    role: "fixer",
    system,
    input: { diagnosis: options.diagnosis },
    schema,
    seed: options.seed,
  });
}
