import { LlmClient } from "./llm/client.js";

export type RawStoryBeat = {
  scene: string;
  detail: string;
};

export type RawStoryDraft = {
  title: string;
  premise: string;
  beats: RawStoryBeat[];
  draftText: string;
};

/**
 * AI Writer Agent generates raw story narrative drafts and beat outlines.
 */
export async function draftStory(options: {
  client: LlmClient;
  premise: string;
  tone: string;
  seed?: number;
}): Promise<RawStoryDraft> {
  const system = `You are a creative game writer. Draft an engaging adventure story based on the premise and tone. Outlines the scenes and story beats.`;
  const schema = {
    type: "object",
    properties: {
      title: { type: "string" },
      premise: { type: "string" },
      beats: {
        type: "array",
        items: {
          type: "object",
          properties: {
            scene: { type: "string" },
            detail: { type: "string" },
          },
          required: ["scene", "detail"],
        },
      },
      draftText: { type: "string" },
    },
    required: ["title", "premise", "beats", "draftText"],
  };

  return options.client.completeJson<RawStoryDraft>({
    role: "writer",
    system,
    input: { premise: options.premise, tone: options.tone },
    schema,
    seed: options.seed,
  });
}
