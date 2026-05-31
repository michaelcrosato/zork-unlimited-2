#!/usr/bin/env tsx
import { readFileSync } from "fs";
import { resolve } from "path";
import { parse as parseYaml } from "yaml";
import { step } from "../core/engine.js";
import { validateCYOAPack } from "../validate/cyoa_validator.js";
import { formatValidationReport } from "../validate/report.js";
import { replayTrace } from "../trace/replay.js";
import { Trace } from "../trace/record.js";
import { CYOAPack } from "../cyoa/schema.js";

function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: replay <trace-file.json> <content-pack.yaml|json>");
    process.exit(1);
  }

  const tracePath = resolve(args[0]);
  const packPath = resolve(args[1]);

  console.log(`Replaying trace: ${tracePath}`);
  console.log(`Using content pack: ${packPath}`);

  // 1. Load and parse content pack
  let packContent = "";
  try {
    packContent = readFileSync(packPath, "utf-8");
  } catch (err: any) {
    console.error(`Error reading content pack file: ${err.message}`);
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
    console.error(`Error parsing content pack file: ${err.message}`);
    process.exit(1);
  }

  // 2. Validate content pack
  const validationReport = validateCYOAPack(packData);
  console.log(formatValidationReport(validationReport));
  if (!validationReport.ok) {
    console.error("Content pack validation failed. Cannot replay trace against invalid content.");
    process.exit(1);
  }

  const validatedPack = packData as CYOAPack;

  // 3. Load and parse trace
  let traceContent = "";
  try {
    traceContent = readFileSync(tracePath, "utf-8");
  } catch (err: any) {
    console.error(`Error reading trace file: ${err.message}`);
    process.exit(1);
  }

  let traceData: Trace = {} as Trace;
  try {
    traceData = JSON.parse(traceContent);
  } catch (err: any) {
    console.error(`Error parsing trace file JSON: ${err.message}`);
    process.exit(1);
  }

  // 4. Run trace replay
  console.log("Starting replay...");
  const replayResult = replayTrace({
    trace: traceData,
    stepFn: (state, action) => step(state, action, validatedPack),
    getStartScene: (packId) => {
      if (packId !== validatedPack.meta.id) {
        throw new Error(`Trace packId '${packId}' does not match content pack '${validatedPack.meta.id}'`);
      }
      return {
        start: validatedPack.meta.start,
        varsInit: validatedPack.meta.vars_init,
        flagsInit: validatedPack.meta.flags_init,
      };
    },
  });

  if (replayResult.success) {
    console.log("\n=================================");
    console.log("🎉 REPLAY COMPLETED SUCCESSFULLY!");
    console.log(`Replayed ${replayResult.stepsReplayed} steps.`);
    console.log(`Final state hash: ${replayResult.finalHash}`);
    console.log("=================================");
    process.exit(0);
  } else {
    console.error("\n=================================");
    console.error("❌ REPLAY FAILED!");
    console.error(`Replayed ${replayResult.stepsReplayed} steps before error.`);
    console.error(`Error: ${replayResult.error}`);
    console.error("=================================");
    process.exit(1);
  }
}

main();
