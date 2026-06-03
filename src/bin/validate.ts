#!/usr/bin/env tsx
import { readFileSync } from "fs";
import { resolve } from "path";
import { parse as parseYaml } from "yaml";
import { validateCYOAPack } from "../validate/cyoa_validator.js";
import { validateParserPack } from "../validate/parser_validator.js";
import { formatValidationReport } from "../validate/report.js";
import { isCyoaPack } from "../core/pack.js";

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error("Usage: validate <content-pack.yaml|json>");
    process.exit(1);
  }

  const packPath = resolve(args[0]);
  console.log(`Loading content pack: ${packPath}...`);

  let packContent: string;
  try {
    packContent = readFileSync(packPath, "utf-8");
  } catch (err: any) {
    console.error(`Error reading file: ${err.message}`);
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
    console.error(`Error parsing file: ${err.message}`);
    process.exit(1);
  }

  if (typeof packData !== "object" || packData === null) {
    console.error("Invalid file structure: Must be a YAML or JSON object.");
    process.exit(1);
  }

  let report;
  if (isCyoaPack(packData)) {
    console.log("Detecting CYOA pack format.");
    report = validateCYOAPack(packData);
  } else if ("rooms" in packData) {
    console.log("Detecting Zork-style Parser pack format.");
    report = validateParserPack(packData);
  } else {
    console.error("Error: Could not identify content pack format (missing 'scenes' or 'rooms' property).");
    process.exit(1);
  }

  console.log("\n" + formatValidationReport(report));
  if (report.ok) {
    console.log("🎉 Validation SUCCESS!");
    process.exit(0);
  } else {
    console.error("❌ Validation FAILED!");
    process.exit(1);
  }
}

main();
