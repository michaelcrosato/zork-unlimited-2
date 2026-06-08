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
import { existsSync, writeFileSync } from "node:fs";
import { readRawFeedback, writeFeedbackDigest } from "../playtest/synthesize.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");

interface ParsedArgs {
  inputFile: string;
  outputFile: string;
  limit: number | undefined;
  windowHours: number | undefined;
  clear: boolean;
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  let inputFile = resolve(PROJECT_ROOT, "feedback_raw.jsonl");
  let outputFile = resolve(PROJECT_ROOT, "feedback_consolidated.md");
  let limit: number | undefined;
  let windowHours: number | undefined;
  let clear = false;

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
      case "--limit":
      case "-l":
        limit = parseInt(args[++i], 10);
        break;
      case "--window":
      case "-w":
        windowHours = parseFloat(args[++i]);
        break;
      case "--clear":
      case "-c":
        clear = true;
        break;
      case "--help":
      case "-h":
        console.error(`
Usage: npx tsx src/bin/synthesize-feedback.ts [options]

Options:
  --input, -i <path>     Raw feedback JSONL file (default: feedback_raw.jsonl)
  --output, -o <path>    Output digest markdown file (default: feedback_consolidated.md)
  --limit, -l <n>        Only analyze the last N sessions
  --window, -w <hours>   Only analyze sessions from the last N hours
  --clear, -c            Clear (truncate) the raw feedback file after synthesis
  --help, -h             Show this help
`);
        process.exit(0);
    }
  }

  return { inputFile, outputFile, limit, windowHours, clear };
}

function main(): void {
  const { inputFile, outputFile, limit, windowHours, clear } = parseArgs();

  console.error(`\n📊 FEEDBACK SYNTHESIS`);
  console.error(`   Input:  ${inputFile}`);
  console.error(`   Output: ${outputFile}`);
  if (limit !== undefined) console.error(`   Limit:  Last ${limit} sessions`);
  if (windowHours !== undefined) console.error(`   Window: Last ${windowHours} hours`);
  if (clear) console.error(`   Clear:  True (raw feedback will be cleared after synthesis)`);
  console.error(``);

  if (!existsSync(inputFile)) {
    console.error(`❌ Input file not found: ${inputFile}`);
    console.error(`   No playtest sessions have been recorded yet.`);
    process.exit(1);
  }

  let sessions = readRawFeedback(inputFile);
  console.error(`   📋 Read ${sessions.length} sessions`);

  if (sessions.length === 0) {
    console.error(`   ⚠️  No valid sessions found in input file.`);
    process.exit(0);
  }

  // Filter by time window if specified
  if (windowHours !== undefined) {
    const cutoffTime = Date.now() - windowHours * 60 * 60 * 1000;
    sessions = sessions.filter((s) => {
      const t = new Date(s.timestamp).getTime();
      return t >= cutoffTime;
    });
    console.error(`   ⏳ Filtered to ${sessions.length} sessions within the last ${windowHours} hours`);
  }

  // Sort by timestamp descending to find the most recent ones first
  sessions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Filter by limit if specified
  if (limit !== undefined && sessions.length > limit) {
    sessions = sessions.slice(0, limit);
    console.error(`   🔢 Limited to the last ${limit} sessions`);
  }

  // Restore chronological order for synthesis logic
  sessions.reverse();

  if (sessions.length === 0) {
    console.error(`   ⚠️  No sessions left after filtering.`);
    process.exit(0);
  }

  // Group by pack for summary
  const packs = new Set(sessions.map((s) => s.packId));
  const personas = new Set(sessions.map((s) => s.persona));
  console.error(`   📦 Packs: ${Array.from(packs).join(", ")}`);
  console.error(`   🎭 Personas: ${Array.from(personas).join(", ")}`);

  writeFeedbackDigest(sessions, outputFile);

  if (clear) {
    writeFileSync(inputFile, "", "utf-8");
    console.error(`   🧹 Raw feedback file truncated: ${inputFile}`);
  }

  console.error(`\n✅ Digest written to: ${outputFile}`);
}

main();
