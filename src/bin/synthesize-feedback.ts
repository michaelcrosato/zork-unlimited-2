#!/usr/bin/env tsx
/**
 * CLI entry point for synthesizing raw playtest feedback into a consolidated digest.
 *
 * Usage:
 *   npx tsx src/bin/synthesize-feedback.ts
 *   npx tsx src/bin/synthesize-feedback.ts --input feedback_raw.jsonl --output feedback_consolidated.md
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { readRawFeedback, writeFeedbackDigest } from "../playtest/synthesize.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");

function parseArgs(): { inputFile: string; outputFile: string } {
  const args = process.argv.slice(2);
  let inputFile = resolve(PROJECT_ROOT, "feedback_raw.jsonl");
  let outputFile = resolve(PROJECT_ROOT, "feedback_consolidated.md");

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--input":
      case "-i":
        inputFile = resolve(args[++i]);
        break;
      case "--output":
      case "-o":
        outputFile = resolve(args[++i]);
        break;
      case "--help":
      case "-h":
        console.error(`
Usage: npx tsx src/bin/synthesize-feedback.ts [options]

Options:
  --input, -i <path>   Raw feedback JSONL file (default: feedback_raw.jsonl)
  --output, -o <path>  Output digest markdown file (default: feedback_consolidated.md)
  --help, -h           Show this help
`);
        process.exit(0);
    }
  }

  return { inputFile, outputFile };
}

function main(): void {
  const { inputFile, outputFile } = parseArgs();

  console.error(`\n📊 FEEDBACK SYNTHESIS`);
  console.error(`   Input:  ${inputFile}`);
  console.error(`   Output: ${outputFile}`);
  console.error(``);

  if (!existsSync(inputFile)) {
    console.error(`❌ Input file not found: ${inputFile}`);
    console.error(`   No playtest sessions have been recorded yet.`);
    process.exit(1);
  }

  const sessions = readRawFeedback(inputFile);
  console.error(`   📋 Read ${sessions.length} sessions`);

  if (sessions.length === 0) {
    console.error(`   ⚠️  No valid sessions found in input file.`);
    process.exit(0);
  }

  // Group by pack for summary
  const packs = new Set(sessions.map((s) => s.packId));
  const personas = new Set(sessions.map((s) => s.persona));
  console.error(`   📦 Packs: ${Array.from(packs).join(", ")}`);
  console.error(`   🎭 Personas: ${Array.from(personas).join(", ")}`);

  writeFeedbackDigest(sessions, outputFile);

  console.error(`\n✅ Digest written to: ${outputFile}`);
}

main();
