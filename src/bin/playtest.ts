#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { parse as parseYaml } from "yaml";
import { runAiPlaytest } from "../agents/playtester.js";
import { MockLlmClient } from "../agents/llm/mock_client.js";
import { validateCYOAPack } from "../validate/cyoa_validator.js";
import { validateParserPack } from "../validate/parser_validator.js";
import { formatValidationReport } from "../validate/report.js";
import { CYOAPack } from "../cyoa/schema.js";
import { ParserPack } from "../parser/schema.js";

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error("Usage: playtest <content-pack.yaml|json> [seed] [--persona <name>]");
    process.exit(1);
  }

  const packPath = resolve(args[0]);
  
  // Parse optional seed and persona arguments
  let seed = 42;
  let persona = "mainline";
  
  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--persona" && i + 1 < args.length) {
      persona = args[i + 1];
      i++;
    } else if (!isNaN(parseInt(args[i], 10))) {
      seed = parseInt(args[i], 10);
    }
  }

  console.log(`Loading content pack for AI playtest: ${packPath}`);
  console.log(`Using seed: ${seed} | Persona: ${persona}`);

  let packContent: string;
  try {
    packContent = readFileSync(packPath, "utf-8");
  } catch (err: any) {
    console.error(`Error reading pack file: ${err.message}`);
    process.exit(1);
  }

  let packData: any;
  try {
    if (packPath.endsWith(".yaml") || packPath.endsWith(".yml")) {
      packData = parseYaml(packContent);
    } else {
      packData = JSON.parse(packContent);
    }
  } catch (err: any) {
    console.error(`Error parsing pack file: ${err.message}`);
    process.exit(1);
  }

  // 1. Validate content pack
  let validationReport;
  let isCyoa = false;

  if ("scenes" in packData) {
    validationReport = validateCYOAPack(packData);
    isCyoa = true;
  } else if ("rooms" in packData) {
    validationReport = validateParserPack(packData);
  } else {
    console.error("Could not identify content pack type.");
    process.exit(1);
  }

  console.log(formatValidationReport(validationReport));
  if (!validationReport.ok) {
    console.error("Content pack has validation errors. Cannot run AI playtest.");
    process.exit(1);
  }

  const pack = packData as CYOAPack | ParserPack;

  // 2. Initialize Mock LLM Client
  const client = new MockLlmClient();

  // 3. Execute AI playtester
  console.log("\nStarting AI playtest session...");
  runAiPlaytest({
    pack,
    client,
    seed,
    traceId: `tr_playtest_${pack.meta.id}_${persona}_${seed}`,
    persona,
    maxSteps: 35,
  }).then((res) => {
    if (res.success) {
      console.log("\n=================================");
      console.log("🎉 AI PLAYTEST COMPLETED SUCCESSFULLY!");
      console.log(`Steps taken: ${res.logs.length}`);
      console.log(`Final location: ${res.finalState.current}`);
      console.log(`Final state hash: ${res.trace.expected_final_hash}`);
      console.log("=================================");

      // Print step progression
      console.log("\n--- PLAYTEST PROGRESSION ---");
      res.logs.forEach((log) => {
        console.log(`[Step ${log.step}] Room: ${log.location}`);
        console.log(`  - Choice: ${log.chosen_action_id}`);
        console.log(`  - Reason: ${log.reason}`);
        console.log(`  - Expected: ${log.expected}`);
      });

      // Save playtest trace
      const tracePath = resolve(`traces/ai_playtest_${pack.meta.id}_${persona}.json`);
      writeFileSync(tracePath, JSON.stringify(res.trace, null, 2), "utf-8");
      console.log(`\n✔ Saved replayable trace to: ${tracePath}`);
      process.exit(0);
    } else {
      console.error("\n=================================");
      console.error("❌ AI PLAYTEST FAILED!");
      console.error(`Error: ${res.error}`);
      console.error("=================================");
      process.exit(1);
    }
  }).catch((err) => {
    console.error(`Fatal playtest error: ${err.message}`);
    process.exit(1);
  });
}

main();
