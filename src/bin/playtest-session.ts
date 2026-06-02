#!/usr/bin/env tsx
/**
 * CLI entry point for running a single blind playtest session.
 *
 * Usage:
 *   npx tsx src/bin/playtest-session.ts --pack chapel_pack_v1 --persona explorer
 *   npx tsx src/bin/playtest-session.ts --pack chapel_pack_v1 --persona new_player --max-steps 50
 *   npx tsx src/bin/playtest-session.ts --pack chapel_pack_v1 --persona adversarial --seed 12345
 *
 * Output: JSON to stdout (PlaytestSessionResult), logs to stderr.
 *
 * The session result is also appended to feedback_raw.jsonl.
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { runBlindPlaytest } from "../playtest/blind_playtester.js";
import { FallbackLlmClient } from "../agents/llm/api_client.js";
import { PERSONA_IDS } from "../playtest/personas.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");

function parseArgs(): {
  packId: string;
  personaId: string;
  maxSteps: number;
  seed: number | undefined;
  outputFile: string;
} {
  const args = process.argv.slice(2);
  let packId = "";
  let personaId = "";
  let maxSteps = 100;
  let seed: number | undefined;
  let outputFile = resolve(PROJECT_ROOT, "feedback_raw.jsonl");

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--pack":
      case "-p":
        packId = args[++i];
        break;
      case "--persona":
        personaId = args[++i];
        break;
      case "--max-steps":
        maxSteps = parseInt(args[++i], 10);
        break;
      case "--seed":
        seed = parseInt(args[++i], 10);
        break;
      case "--output":
      case "-o":
        outputFile = resolve(args[++i]);
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
    }
  }

  if (!packId) {
    console.error("❌ Error: --pack is required");
    printHelp();
    process.exit(1);
  }

  if (!personaId) {
    console.error("❌ Error: --persona is required");
    printHelp();
    process.exit(1);
  }

  if (!PERSONA_IDS.includes(personaId)) {
    console.error(
      `❌ Error: Unknown persona '${personaId}'. Valid: ${PERSONA_IDS.join(", ")}`
    );
    process.exit(1);
  }

  return { packId, personaId, maxSteps, seed, outputFile };
}

function printHelp(): void {
  console.error(`
Usage: npx tsx src/bin/playtest-session.ts [options]

Options:
  --pack, -p <id>     Adventure pack ID (required)
  --persona <id>      Persona ID (required). One of: ${PERSONA_IDS.join(", ")}
  --max-steps <n>     Max turns before stopping (default: 100)
  --seed <n>          RNG seed for deterministic play
  --output, -o <path> Output JSONL file (default: feedback_raw.jsonl)
  --help, -h          Show this help

Example:
  npx tsx src/bin/playtest-session.ts --pack chapel_pack_v1 --persona explorer
`);
}

async function main(): Promise<void> {
  const { packId, personaId, maxSteps, seed, outputFile } = parseArgs();

  console.error(`\n🎮 BLIND PLAYTEST SESSION`);
  console.error(`   Pack:    ${packId}`);
  console.error(`   Persona: ${personaId}`);
  console.error(`   Max:     ${maxSteps} steps`);
  console.error(`   Seed:    ${seed ?? "random"}`);
  console.error(``);

  // Use FallbackLlmClient — auto-detects Gemini/OpenAI from env, falls back to Mock
  const llmClient = new FallbackLlmClient();
  const isMock = llmClient.getIsFallback();
  const modelName = isMock
    ? "mock"
    : process.env.GEMINI_API_KEY
      ? process.env.GEMINI_MODEL || "gemini-1.5-flash"
      : process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (isMock) {
    console.error(
      "⚠️  No API key found — using MockLlmClient (deterministic but limited)"
    );
  } else {
    console.error(`🤖 Using model: ${modelName}`);
  }

  const startTime = Date.now();

  const result = await runBlindPlaytest({
    packId,
    personaId,
    llmClient,
    maxSteps,
    seed,
    modelName,
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Log summary to stderr
  console.error(`\n📊 SESSION COMPLETE (${elapsed}s)`);
  console.error(`   Outcome:        ${result.session.outcome}`);
  console.error(`   Steps:          ${result.session.totalSteps}`);
  console.error(`   Rooms visited:  ${result.session.uniqueRoomsVisited}`);
  console.error(`   Actions rejected: ${result.session.actionsRejected}`);
  console.error(`   Deaths:         ${result.session.deaths}`);
  console.error(`   Ending:         ${result.session.endingReached ?? "none"}`);

  if (result.error) {
    console.error(`   ⚠️  Error: ${result.error}`);
  }

  // Append to JSONL feedback file
  try {
    mkdirSync(dirname(outputFile), { recursive: true });
    appendFileSync(outputFile, JSON.stringify(result.session) + "\n");
    console.error(`   📝 Appended to: ${outputFile}`);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`   ❌ Failed to write feedback: ${errMsg}`);
  }

  // Save trace file
  try {
    const tracesDir = resolve(PROJECT_ROOT, "traces");
    mkdirSync(tracesDir, { recursive: true });
    const traceFile = resolve(
      tracesDir,
      `playtest_${result.session.sessionId}.json`
    );
    writeFileSync(
      traceFile,
      JSON.stringify(
        { sessionId: result.session.sessionId, turns: result.turnLogs },
        null,
        2
      )
    );
    console.error(`   📼 Trace saved: ${traceFile}`);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`   ❌ Failed to save trace: ${errMsg}`);
  }

  // Output full session JSON to stdout (for piping/scripting)
  console.log(JSON.stringify(result.session, null, 2));
}

main().catch((err) => {
  console.error(`\n💥 Playtest session crashed: ${err}`);
  process.exit(1);
});
