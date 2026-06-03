#!/usr/bin/env tsx
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { parse as parseYaml } from "yaml";
import { execSync } from "child_process";
import { validateCYOAPack } from "../validate/cyoa_validator.js";
import { validateParserPack } from "../validate/parser_validator.js";
import { runAiPlaytest } from "../agents/playtester.js";
import { diagnosePlaytest } from "../agents/debugger.js";
import { fixIdentifiedBug } from "../agents/fixer.js";
import { FallbackLlmClient } from "../agents/llm/api_client.js";

interface PackResult {
  name: string;
  type: "CYOA" | "Parser";
  valid: boolean;
  errors: number;
  warnings: number;
  playtestSteps?: number;
  playtestEnding?: string;
  playtestSuccess?: boolean;
  selfHealed?: boolean;
  diagnosisText?: string;
  fixText?: string;
}

function runCommand(cmd: string): { success: boolean; output: string } {
  try {
    const output = execSync(cmd, { encoding: "utf-8", stdio: "pipe" });
    return { success: true, output };
  } catch (err: any) {
    return { success: false, output: err.stdout || err.stderr || err.message };
  }
}

async function runAutopilotCycle(cycleIndex: number): Promise<boolean> {
  console.log("=========================================");
  console.log(`🤖 AI AUTOPILOT CYCLE #${cycleIndex}`);
  console.log("=========================================\n");

  const startTime = Date.now();
  const packResults: PackResult[] = [];

  // 1. Core Health Checks (Build & Test)
  console.log("🛠️ Step 1: Running TypeScript Compiler check...");
  const buildCheck = runCommand("pnpm build");
  console.log(buildCheck.success ? "🟢 Build: SUCCESS" : "🔴 Build: FAILED");

  console.log("\n🧪 Step 2: Running Vitest Test Suite...");
  const testCheck = runCommand("pnpm test");
  console.log(testCheck.success ? "🟢 Tests: PASS" : "🔴 Tests: FAIL");

  // 2. Validate and Playtest Content Packs
  console.log("\n🎮 Step 3: Validating and Playtesting Content Packs...");
  const packs = [
    { path: "content/parser/pack/heros_quest.yaml", type: "Parser" as const },
    { path: "content/parser/pack/chapel.yaml", type: "Parser" as const },
    { path: "content/parser/pack/guild_showcase.yaml", type: "Parser" as const },
    { path: "content/cyoa/pack/watchtower.yaml", type: "CYOA" as const },
  ];

  const client = new FallbackLlmClient();

  for (const packMeta of packs) {
    const fullPath = resolve(packMeta.path);
    if (!existsSync(fullPath)) {
      console.log(`⚠️ Pack not found: ${packMeta.path}`);
      continue;
    }

    const content = readFileSync(fullPath, "utf-8");
    const data = parseYaml(content);
    let valid = false;
    let errorsCount = 0;
    let warningsCount = 0;

    // Validation
    if (packMeta.type === "Parser") {
      const report = validateParserPack(data);
      valid = report.ok;
      errorsCount = report.findings.filter((f) => f.severity === "error").length;
      warningsCount = report.findings.filter((f) => f.severity === "warning").length;
    } else {
      const report = validateCYOAPack(data);
      valid = report.ok;
      errorsCount = report.findings.filter((f) => f.severity === "error").length;
      warningsCount = report.findings.filter((f) => f.severity === "warning").length;
    }

    const packResult: PackResult = {
      name: data.meta?.title || data.meta?.id || packMeta.path,
      type: packMeta.type,
      valid,
      errors: errorsCount,
      warnings: warningsCount,
    };

    // Playtesting & Self-Healing
    if (valid) {
      try {
        const res = await runAiPlaytest({
          pack: data,
          client,
          seed: 42,
          traceId: `autopilot_${data.meta.id}`,
          persona: "speedrunner",
          maxSteps: 35,
        });

        packResult.playtestSuccess = res.success;
        packResult.playtestSteps = res.logs.length;
        packResult.playtestEnding = res.finalState.endingId || res.finalState.current;

        if (!res.success) {
          console.log(`⚠️ Playtest failed or soft-locked for ${packResult.name}. Initiating Self-Healing...`);
          const diagnosis = await diagnosePlaytest({
            client,
            logs: res.logs,
            seed: 42,
          });
          packResult.diagnosisText = diagnosis.diagnosis;
          console.log(`🔍 Diagnosis: ${diagnosis.diagnosis} | Severity: ${diagnosis.severity}`);

          const fixResult = await fixIdentifiedBug({
            client,
            diagnosis,
            seed: 42,
          });
          packResult.fixText = fixResult.applied_patch;
          console.log(`🩹 Proposed patch: ${fixResult.applied_patch}`);

          if (fixResult.fixed) {
            console.log(`🚀 Validating proposed fix by re-running playtest...`);
            const retestRes = await runAiPlaytest({
              pack: data,
              client,
              seed: 42,
              traceId: `autopilot_healed_${data.meta.id}`,
              persona: "speedrunner",
              maxSteps: 35,
            });

            if (retestRes.success) {
              console.log(`🟢 Self-healing SUCCESSFUL! The patch resolved the playtest failure.`);
              packResult.playtestSuccess = true;
              packResult.playtestSteps = retestRes.logs.length;
              packResult.playtestEnding = retestRes.finalState.endingId || retestRes.finalState.current;
              packResult.selfHealed = true;
            } else {
              console.log(`🔴 Self-healing FAILED! The patch did not resolve the failure.`);
              packResult.selfHealed = false;
            }
          } else {
            console.log(`🔴 AI Fixer failed to generate a fix.`);
          }
        }
      } catch (err: any) {
        packResult.playtestSuccess = false;
        packResult.playtestEnding = `Error: ${err.message}`;
      }
    }

    packResults.push(packResult);
    console.log(
      `  - ${packResult.name} (${packResult.type}): Validation=${valid ? "🟢" : "🔴"} | Playtest=${
        packResult.playtestSuccess
          ? `🟢 (${packResult.playtestSteps} steps, Ending: ${packResult.playtestEnding})`
          : "🔴"
      }`
    );
  }

  // 3. Write Autopilot Report
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  const reportPath = resolve("ai_autopilot_report.md");

  const mdReport = `# 🤖 AI Autopilot Living Report

* **Last Updated**: ${new Date().toISOString()}
* **Autopilot Cycle**: #${cycleIndex}
* **Cycle Duration**: ${durationSec} seconds
* **Build Status**: ${buildCheck.success ? "🟢 PASS" : "🔴 FAIL"}
* **Tests Status**: ${testCheck.success ? "🟢 PASS" : "🔴 FAIL"}

## 🗺️ Content Packs Audit

| Content Pack | Type | Validated | Errors | Warnings | Playtest Steps | Final Outcome | Playtest Result |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
${packResults
  .map(
    (p) =>
      `| **${p.name}** | ${p.type} | ${p.valid ? "🟢 YES" : "🔴 NO"} | ${p.errors} | ${p.warnings} | ${
        p.playtestSteps ?? "N/A"
      } | \`${p.playtestEnding ?? "N/A"}\` | ${p.playtestSuccess ? "🟢 SUCCESS" : p.playtestSuccess === false ? "🔴 FAILED" : "➖"}`
  )
  .join("\n")}
${
  packResults.some((p) => p.selfHealed !== undefined)
    ? `
## 🩹 Self-Healing Outcomes

| Content Pack | Diagnosis | Proposed Fix | Healing Outcome |
| :--- | :--- | :--- | :--- |
${packResults
  .filter((p) => p.selfHealed !== undefined)
  .map(
    (p) =>
      `| **${p.name}** | ${p.diagnosisText || "N/A"} | ${p.fixText || "N/A"} | ${p.selfHealed ? "🟢 SUCCESS" : "🔴 FAILED"}`
  )
  .join("\n")}
`
    : ""
}
## 📊 Detailed Metrics & System Logs

### TypeScript Build Log
\`\`\`
${buildCheck.output.trim() || "Clean compilation."}
\`\`\`

### Unit Tests Log
\`\`\`
${testCheck.output.split("\n").slice(-8).join("\n").trim()}
\`\`\`

---
*Autonomous Development Agent loop successfully active. Stand by for the next validation cycle.*
`;

  writeFileSync(reportPath, mdReport, "utf-8");
  console.log(`\n📝 Saved status report to: ${reportPath}`);
  console.log("=========================================\n");

  return buildCheck.success && testCheck.success && packResults.every((p) => p.valid && p.playtestSuccess);
}

async function main() {
  const args = process.argv.slice(2);
  const isLoop = args.includes("--loop");
  const intervalArgIndex = args.indexOf("--interval");
  const intervalSec =
    intervalArgIndex !== -1 && intervalArgIndex + 1 < args.length ? parseInt(args[intervalArgIndex + 1], 10) : 10;

  let cycle = 1;

  if (isLoop) {
    console.log(`🚀 Starting AI Autopilot loop with an interval of ${intervalSec} seconds. Press CTRL-C to exit.`);
    while (true) {
      await runAutopilotCycle(cycle++);
      console.log(`Sleeping for ${intervalSec} seconds before the next cycle...\n`);
      await new Promise((resolve) => setTimeout(resolve, intervalSec * 1000));
    }
  } else {
    const success = await runAutopilotCycle(cycle);
    process.exit(success ? 0 : 1);
  }
}

main().catch((err) => {
  console.error("Autopilot crashed:", err);
  process.exit(1);
});
