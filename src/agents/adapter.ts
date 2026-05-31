import { LlmClient } from "./llm/client.js";
import { CYOAPack } from "../cyoa/schema.js";
import { RawStoryDraft } from "./writer.js";
import { validateCYOAPack } from "../validate/cyoa_validator.js";

export type AdaptationResult = {
  success: boolean;
  pack: CYOAPack;
  validationErrors?: string[];
};

/**
 * AI Adapter Agent maps a raw story draft to a strictly structured, schema-valid CYOAPack.
 */
export async function adaptStoryToPack(options: {
  client: LlmClient;
  story: RawStoryDraft;
  packId: string;
  seed?: number;
}): Promise<AdaptationResult> {
  const system = `You are a strict game mechanics adapter. Map the story draft into a schema-valid CYOAPack JSON structure conforming to the specified format.`;

  // Define simplified validation schema for Zod adaptation output
  const schema = {
    type: "object",
    properties: {
      meta: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          start: { type: "string" },
          vars_init: { type: "object", additionalProperties: { type: "number" } },
          flags_init: { type: "array", items: { type: "string" } },
        },
        required: ["id", "title", "start"],
      },
      scenes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            text: { type: "string" },
            on_enter: { type: "array", items: { type: "object" } },
            is_ending: { type: "boolean" },
            choices: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  text: { type: "string" },
                  conditions: { type: "array", items: { type: "object" } },
                  effects: { type: "array", items: { type: "object" } },
                  next: { type: "string" },
                },
                required: ["id", "text", "next"],
              },
            },
          },
          required: ["id", "title", "text"],
        },
      },
      endings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            text: { type: "string" },
          },
          required: ["id", "title", "text"],
        },
      },
    },
    required: ["meta", "scenes"],
  };

  const pack = await options.client.completeJson<CYOAPack>({
    role: "adapter",
    system,
    input: { story: options.story, packId: options.packId },
    schema,
    seed: options.seed,
  });

  // Verify adaptation outputs with compile-time validator
  const report = validateCYOAPack(pack);

  if (!report.ok) {
    const errorMsgs = report.findings.map((f) => `[${f.code}] ${f.message}`);
    return {
      success: false,
      pack,
      validationErrors: errorMsgs,
    };
  }

  return {
    success: true,
    pack,
  };
}
