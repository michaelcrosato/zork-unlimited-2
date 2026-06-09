import { readFileSync, existsSync, statSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";

interface MonitorReport {
  timestamp: string;
  devLoopActive: boolean;
  playtestLoopActive: boolean;
  typecheckOk: boolean;
  testsOk: boolean;
  anomaliesDetected: string[];
  recentTokenCostUsd: number;
  recentPlaytestStats: {
    total: number;
    success: number;
    failed: number;
    quit: number;
  };
}

function runCommand(cmd: string): { success: boolean; output: string } {
  try {
    const output = execSync(cmd, { encoding: "utf-8", stdio: "pipe" });
    return { success: true, output };
  } catch (err: any) {
    return { success: false, output: err.stdout || err.stderr || err.message };
  }
}

async function runMonitor(): Promise<MonitorReport> {
  const anomalies: string[] = [];
  const now = new Date();

  // 1. Check Dev Loop activity (living_plan.md)
  let devLoopActive = false;
  const planPath = resolve("living_plan.md");
  if (existsSync(planPath)) {
    const planStat = statSync(planPath);
    const timeDiffMs = now.getTime() - planStat.mtime.getTime();
    const timeDiffMins = timeDiffMs / (1000 * 60);
    // If updated in the last 15 minutes, count as active
    if (timeDiffMins <= 15) {
      devLoopActive = true;
    }
  }

  // 2. Check Playtest Loop activity (feedback_raw.jsonl)
  let playtestLoopActive = false;
  const feedbackPath = resolve("feedback_raw.jsonl");
  const recentPlaytestStats = { total: 0, success: 0, failed: 0, quit: 0 };

  if (existsSync(feedbackPath)) {
    const feedbackStat = statSync(feedbackPath);
    const timeDiffMs = now.getTime() - feedbackStat.mtime.getTime();
    const timeDiffMins = timeDiffMs / (1000 * 60);
    if (timeDiffMins <= 5) {
      playtestLoopActive = true;
    }

    // Read last 50 lines of feedback_raw.jsonl to verify health
    try {
      const content = readFileSync(feedbackPath, "utf-8").trim();
      const lines = content.split("\n").filter(Boolean).slice(-50);
      for (const line of lines) {
        const entry = JSON.parse(line);
        recentPlaytestStats.total++;
        if (entry.outcome === "completed" || entry.outcome === "success") {
          recentPlaytestStats.success++;
        } else if (entry.outcome && entry.outcome.startsWith("quit")) {
          recentPlaytestStats.quit++;
        } else {
          recentPlaytestStats.failed++;
        }
      }
    } catch (err) {
      anomalies.push(`Failed to parse feedback_raw.jsonl: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 3. Scan dev_loop.log for circuit breakers
  const devLogPath = resolve("dev_loop.log");
  if (existsSync(devLogPath)) {
    try {
      const devLog = readFileSync(devLogPath, "utf-8");
      if (devLog.includes("🛑 CIRCUIT BREAKER TRIGGERED!")) {
        anomalies.push("Circuit breaker detected in dev_loop.log!");
      }
    } catch {}
  }

  // 4. Check typescript build compilation status
  console.log("🛠️ Compiling codebase for health check...");
  const typecheck = runCommand("pnpm typecheck");
  if (!typecheck.success) {
    anomalies.push("TypeScript typecheck is FAILED!");
  }

  // 5. Check Vitest unit tests (quick run)
  console.log("🧪 Running unit test suite for health check...");
  const testRun = runCommand("npx vitest run tests/determinism.test.ts");
  if (!testRun.success) {
    anomalies.push("Unit tests are FAILED!");
  }

  // 6. Token Cost Assessment (traces/token_usage.jsonl)
  let recentTokenCostUsd = 0;
  const tokenLogPath = resolve("traces/token_usage.jsonl");
  if (existsSync(tokenLogPath)) {
    try {
      const tokenContent = readFileSync(tokenLogPath, "utf-8").trim();
      const lines = tokenContent.split("\n").filter(Boolean);
      for (const line of lines) {
        const entry = JSON.parse(line);
        const entryTime = new Date(entry.timestamp);
        const timeDiffMs = now.getTime() - entryTime.getTime();
        const timeDiffHours = timeDiffMs / (1000 * 60 * 60);
        // Sum up usage in the last 1 hour
        if (timeDiffHours <= 1.0) {
          recentTokenCostUsd += entry.costUsd || 0;
        }
      }
    } catch {}
  }

  return {
    timestamp: now.toISOString(),
    devLoopActive,
    playtestLoopActive,
    typecheckOk: typecheck.success,
    testsOk: testRun.success,
    anomaliesDetected: anomalies,
    recentTokenCostUsd: parseFloat(recentTokenCostUsd.toFixed(4)),
    recentPlaytestStats,
  };
}

async function main() {
  const report = await runMonitor();
  console.log("\n=========================================");
  console.log("🔍 ADVENTUREFORGE LOOP MONITOR STATUS");
  console.log(`🕒 Timestamp: ${report.timestamp}`);
  console.log(`🔄 Dev Loop Active: ${report.devLoopActive ? "🟢 YES" : "🔴 NO"}`);
  console.log(`🎮 Playtest Loop Active: ${report.playtestLoopActive ? "🟢 YES" : "🔴 NO"}`);
  console.log(`🛠️ Typecheck Status: ${report.typecheckOk ? "🟢 OK" : "🔴 FAILED"}`);
  console.log(`🧪 Test Suite Status: ${report.testsOk ? "🟢 OK" : "🔴 FAILED"}`);
  console.log(`💰 Token Cost (Last 1hr): $${report.recentTokenCostUsd}`);
  console.log(
    `📊 Recent Playtest Runs: ${report.recentPlaytestStats.total} total (${report.recentPlaytestStats.success} win, ${report.recentPlaytestStats.failed} fail, ${report.recentPlaytestStats.quit} quit)`
  );

  if (report.anomaliesDetected.length > 0) {
    console.log("⚠️ ANOMALIES DETECTED:");
    report.anomaliesDetected.forEach((a) => console.log(` - 🔴 ${a}`));
    process.exit(1);
  } else {
    console.log("🟢 All systems normal. No anomalies detected.");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Monitor crashed:", err);
  process.exit(1);
});
