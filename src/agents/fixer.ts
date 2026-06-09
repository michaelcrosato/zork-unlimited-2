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
  pack: any;
  seed?: number;
}): Promise<ContentFixResult> {
  const system = `You are a software and game design fixer. Propose a specific content fix or schema update to resolve the diagnosed issue.
You receive both the diagnosis and the full content pack data.
If you propose a content fix, your 'applied_patch' string SHOULD be a valid structured JSON object in the format:
{
  "updates": [
    { "path": "scenes.0.text", "value": "New scene text..." },
    { "path": "rooms.entrance.description", "value": "New room description..." }
  ]
}
If a structured patch is not possible or the fix is not content-based, you may provide a normal textual description or unified diff.`;
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
    input: { diagnosis: options.diagnosis, pack: options.pack },
    schema,
    seed: options.seed,
  });
}
