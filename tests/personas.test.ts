import { describe, it, expect } from "vitest";
import { parse as parseYaml } from "yaml";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { ParserPackSchema } from "../src/parser/schema.js";
import { runAiPlaytest } from "../src/agents/playtester.js";
import { MockLlmClient } from "../src/agents/llm/mock_client.js";

describe("Playtest Persona Verification (AF-07)", () => {
  const chapelPath = fileURLToPath(new URL("../content/parser/pack/chapel.yaml", import.meta.url));
  const chapelPack = ParserPackSchema.parse(parseYaml(readFileSync(chapelPath, "utf-8")));

  const herosQuestPath = fileURLToPath(new URL("../content/parser/pack/heros_quest.yaml", import.meta.url));
  const herosQuestPack = ParserPackSchema.parse(parseYaml(readFileSync(herosQuestPath, "utf-8")));

  const client = new MockLlmClient();

  const personas = ["speedrunner", "mainline", "hoarder", "dropper", "explorer"];

  describe("The Sealed Crypt (chapel.yaml) Persona Tests", () => {
    personas.forEach((persona) => {
      it(`should successfully complete chapel.yaml under the '${persona}' persona`, async () => {
        const result = await runAiPlaytest({
          pack: chapelPack,
          client,
          seed: 42,
          traceId: `test_chapel_${persona}`,
          persona,
          maxSteps: 50,
        });

        if (!result.success) {
          console.error(`=== CHAPEL.YAML FAILURE LOGS FOR ${persona} ===`);
          console.error(result.error);
          console.error(JSON.stringify(result.logs, null, 2));
        }

        expect(result.success).toBe(true);
        expect(result.finalState.ended).toBe(true);
        expect(result.finalState.endingId).toBe("ending_victory");
      });
    });
  });

  describe("Hero's Quest (heros_quest.yaml) Persona Tests", () => {
    personas.forEach((persona) => {
      it(`should successfully complete heros_quest.yaml under the '${persona}' persona`, async () => {
        const result = await runAiPlaytest({
          pack: herosQuestPack,
          client,
          seed: 42,
          traceId: `test_heros_quest_${persona}`,
          persona,
          maxSteps: 50,
        });

        if (!result.success) {
          console.error(`=== HEROS_QUEST.YAML FAILURE LOGS FOR ${persona} ===`);
          console.error(result.error);
          console.error(JSON.stringify(result.logs, null, 2));
        }

        expect(result.success).toBe(true);
        expect(result.finalState.ended).toBe(true);
        expect(result.finalState.endingId).toBe("ending_victory");
      });
    });
  });
});
