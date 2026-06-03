import { parse as parseYaml } from "yaml";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { ParserPackSchema } from "../src/parser/schema.js";
import { runAiPlaytest } from "../src/agents/playtester.js";
import { MockLlmClient } from "../src/agents/llm/mock_client.js";

async function main() {
  const chapelPath = resolve("content/parser/pack/chapel.yaml");
  const chapelPack = ParserPackSchema.parse(parseYaml(readFileSync(chapelPath, "utf-8")));

  const herosQuestPath = resolve("content/parser/pack/heros_quest.yaml");
  const herosQuestPack = ParserPackSchema.parse(parseYaml(readFileSync(herosQuestPath, "utf-8")));

  const client = new MockLlmClient();

  console.log("Running chapel explorer...");
  const resChapelExplorer = await runAiPlaytest({
    pack: chapelPack,
    client,
    seed: 42,
    traceId: "debug_chapel_explorer",
    persona: "explorer",
    maxSteps: 50,
  });
  writeFileSync("chapel_explorer_log.json", JSON.stringify({ success: resChapelExplorer.success, error: resChapelExplorer.error, logs: resChapelExplorer.logs }, null, 2));

  console.log("Running heros quest dropper...");
  const resHerosDropper = await runAiPlaytest({
    pack: herosQuestPack,
    client,
    seed: 42,
    traceId: "debug_heros_dropper",
    persona: "dropper",
    maxSteps: 50,
  });
  writeFileSync("heros_dropper_log.json", JSON.stringify({ success: resHerosDropper.success, error: resHerosDropper.error, logs: resHerosDropper.logs }, null, 2));

  console.log("Running heros quest explorer...");
  const resHerosExplorer = await runAiPlaytest({
    pack: herosQuestPack,
    client,
    seed: 42,
    traceId: "debug_heros_explorer",
    persona: "explorer",
    maxSteps: 50,
  });
  writeFileSync("heros_explorer_log.json", JSON.stringify({ success: resHerosExplorer.success, error: resHerosExplorer.error, logs: resHerosExplorer.logs }, null, 2));

  console.log("Done debugging!");
}

main().catch(console.error);
