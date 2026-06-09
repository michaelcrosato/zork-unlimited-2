import { LlmClient } from "./llm/client.js";
import { runAiPlaytest, PlaytestResult } from "./playtester.js";
import { diagnosePlaytest, BugDiagnosis } from "./debugger.js";
import { fixIdentifiedBug, ContentFixResult } from "./fixer.js";
import { CYOAPack } from "../cyoa/schema.js";
import { ParserPack } from "../parser/schema.js";
import * as fs from "fs";
import * as path from "path";

/**
 * Helper to apply structured JSON patches dynamically to a CYOAPack or ParserPack.
 */
function applyStructuredPatch(pack: any, patchStr: string): any {
  try {
    const patchObj = JSON.parse(patchStr);
    if (patchObj && Array.isArray(patchObj.updates)) {
      // Create a deep copy of pack to avoid mutating the original
      const newPack = JSON.parse(JSON.stringify(pack));
      for (const update of patchObj.updates) {
        if (!update.path || update.value === undefined) continue;
        const parts = update.path.split(".");
        let current = newPack;
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!(part in current)) {
            current[part] = /^\d+$/.test(parts[i + 1]) ? [] : {};
          }
          current = current[part];
        }
        const lastPart = parts[parts.length - 1];
        current[lastPart] = update.value;
      }
      return newPack;
    }
  } catch {
    // Fall back to original pack if it is not valid structured JSON
  }
  return pack;
}

export interface OrchestratorOptions {
  client: LlmClient;
  maxSubagents?: number; // Maximum number of concurrent subagents we can deploy
  personas?: string[]; // Personas to deploy (e.g. speedrunner, explorer, hoarder, dropper, mainline)
  seed?: number;
  approvalGate?: boolean; // Enable human-in-the-loop approval gate
  runId?: string; // Unique run identifier for telemetry and logging
}

export interface PersonaRunResult {
  persona: string;
  success: boolean;
  steps: number;
  ending?: string;
  error?: string;
  diagnosis?: BugDiagnosis;
  proposedFix?: ContentFixResult;
  validationSuccess?: boolean;
}

export interface OrchestrationReport {
  success: boolean;
  totalSubagentsDeployed: number;
  concurrencyLimit: number;
  personaRuns: PersonaRunResult[];
  synthesis: {
    best_patch?: string;
    summary: string;
    confidence_score: number;
  };
}

export interface OrchestratorCheckpoint {
  runId: string;
  packId: string;
  phase: "START" | "PLAYTESTING" | "DIAGNOSING" | "FIXING" | "COMPLETED";
  personaRuns: PersonaRunResult[];
  totalSubagentsDeployed: number;
}

/**
 * Log a structured telemetry entry to traces/orchestrator_runs.jsonl
 */
function logTelemetry(entry: {
  runId: string;
  packId: string;
  role: string;
  persona?: string;
  action: string;
  durationMs: number;
  status: "success" | "failure";
  details?: string;
}) {
  const logDir = path.resolve("traces");
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logPath = path.join(logDir, "orchestrator_runs.jsonl");
  const logLine = JSON.stringify({ timestamp: new Date().toISOString(), ...entry }) + "\n";
  fs.appendFileSync(logPath, logLine, "utf-8");
}

/**
 * Save state checkpoint
 */
function saveCheckpoint(checkpoint: OrchestratorCheckpoint) {
  const logDir = path.resolve("traces");
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const checkpointPath = path.join(logDir, `orchestrator_checkpoint_${checkpoint.packId}.json`);
  fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2), "utf-8");
}

/**
 * Load state checkpoint
 */
function loadCheckpoint(packId: string, runId: string): OrchestratorCheckpoint | null {
  const checkpointPath = path.resolve("traces", `orchestrator_checkpoint_${packId}.json`);
  if (fs.existsSync(checkpointPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(checkpointPath, "utf-8")) as OrchestratorCheckpoint;
      if (data.packId === packId && data.runId === runId && data.phase !== "COMPLETED") {
        console.log(`🌀 Checkpoint loaded: Resuming run '${runId}' from phase: ${data.phase}`);
        return data;
      }
    } catch (err) {
      console.warn("⚠️ Failed to parse orchestrator checkpoint:", err);
    }
  }
  return null;
}

/**
 * A robust worker pool helper to limit concurrency when executing asynchronous tasks.
 */
async function runWithLimit<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < tasks.length) {
      const index = currentIndex++;
      try {
        results[index] = await tasks[index]();
      } catch (err: any) {
        throw new Error(`Worker task at index ${index} failed: ${err.message}`);
      }
    }
  }

  const workerCount = Math.min(limit, tasks.length);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Orchestrator coordinates concurrent subagents (playtesters, debuggers, fixers)
 * to audit, diagnose, and self-heal content packs.
 */
export async function runOrchestratedAudit(
  pack: CYOAPack | ParserPack,
  options: OrchestratorOptions
): Promise<OrchestrationReport> {
  const client = options.client;
  const maxSubagents = options.maxSubagents ?? 5;
  const personas = options.personas ?? ["speedrunner", "explorer", "hoarder", "dropper", "mainline"];
  const baseSeed = options.seed ?? 42;
  const runId = options.runId ?? `run_${Date.now()}`;
  const packId = pack.meta.id;

  console.log(`🌀 Orchestrator: Initiating content audit for pack '${packId}' | Run: '${runId}'`);
  console.log(`👥 Deploying up to ${maxSubagents} concurrent subagent tasks...`);

  // Load checkpoint if resumable
  const checkpoint = loadCheckpoint(packId, runId);
  let phase = checkpoint?.phase ?? "START";
  let personaRuns: PersonaRunResult[] = checkpoint?.personaRuns ?? [];
  let totalSubagentsDeployed = checkpoint?.totalSubagentsDeployed ?? 0;

  // 1. Playtesting Phase (Skip if already completed in checkpoint)
  if (phase === "START") {
    const playtestTasks = personas.map((persona, index) => {
      return async (): Promise<{ persona: string; result: PlaytestResult }> => {
        const startTime = Date.now();
        console.log(`🕵️ Subagent: Starting playtest persona '${persona}'...`);
        totalSubagentsDeployed++;
        const result = await runAiPlaytest({
          pack,
          client,
          seed: baseSeed + index,
          traceId: `orchestrated_${persona}_${packId}`,
          persona,
          maxSteps: 35,
        });

        logTelemetry({
          runId,
          packId,
          role: "playtester",
          persona,
          action: "playtest",
          durationMs: Date.now() - startTime,
          status: result.success ? "success" : "failure",
          details: result.error,
        });

        return { persona, result };
      };
    });

    const playtestOutcomes = await runWithLimit(playtestTasks, maxSubagents);

    personaRuns = playtestOutcomes.map(({ persona, result }) => ({
      persona,
      success: result.success,
      steps: result.logs.length,
      ending: result.finalState.endingId || result.finalState.current,
      error: result.error,
    }));

    phase = "PLAYTESTING";
    saveCheckpoint({ runId, packId, phase, personaRuns, totalSubagentsDeployed });
  }

  // 2. Diagnosis Phase (Skip if already completed)
  const failedRuns = personaRuns.filter((r) => !r.success && !r.diagnosis);
  if (phase === "PLAYTESTING" && failedRuns.length > 0) {
    console.log(`⚠️ ${failedRuns.length} playtest personas failed. Deploying Debugger subagents...`);

    const diagnosisTasks = failedRuns.map((run) => {
      return async (): Promise<{ persona: string; diagnosis: BugDiagnosis }> => {
        const startTime = Date.now();
        console.log(`🔍 Subagent: Diagnosing failure for persona '${run.persona}'...`);
        totalSubagentsDeployed++;

        // Fetch the corresponding logs from original playtest
        const logsPath = path.resolve("traces", `orchestrated_${run.persona}_${packId}.json`);
        let logs = [];
        if (fs.existsSync(logsPath)) {
          try {
            const traceData = JSON.parse(fs.readFileSync(logsPath, "utf-8"));
            logs = traceData.logs || [];
          } catch (err) {
            console.warn("⚠️ Failed to load playtest trace logs for diagnosis:", err);
          }
        }

        const d = await diagnosePlaytest({
          client,
          logs,
          pack,
          seed: baseSeed,
        });

        logTelemetry({
          runId,
          packId,
          role: "debugger",
          persona: run.persona,
          action: "diagnose",
          durationMs: Date.now() - startTime,
          status: d.issue_identified ? "success" : "failure",
          details: d.diagnosis,
        });

        return { persona: run.persona, diagnosis: d };
      };
    });

    const diagnoses = await runWithLimit(diagnosisTasks, maxSubagents);

    for (const d of diagnoses) {
      const run = personaRuns.find((r) => r.persona === d.persona);
      if (run) run.diagnosis = d.diagnosis;
    }

    phase = "DIAGNOSING";
    saveCheckpoint({ runId, packId, phase, personaRuns, totalSubagentsDeployed });
  }

  // 3. Fixing Phase (Skip if already completed)
  const undiagnosedFixes = personaRuns.filter((r) => r.diagnosis?.issue_identified && !r.proposedFix);
  if (phase === "DIAGNOSING" && undiagnosedFixes.length > 0) {
    console.log(`🩹 Deploying Fixer subagents...`);

    const fixerTasks = undiagnosedFixes.map((run) => {
      return async (): Promise<{ persona: string; fix: ContentFixResult }> => {
        const startTime = Date.now();
        console.log(`🩹 Subagent: Generating fix for persona '${run.persona}'...`);
        totalSubagentsDeployed++;
        const fix = await fixIdentifiedBug({
          client,
          diagnosis: run.diagnosis!,
          pack,
          seed: baseSeed,
        });

        logTelemetry({
          runId,
          packId,
          role: "fixer",
          persona: run.persona,
          action: "fix",
          durationMs: Date.now() - startTime,
          status: fix.fixed ? "success" : "failure",
          details: fix.applied_patch,
        });

        return { persona: run.persona, fix };
      };
    });

    const fixes = await runWithLimit(fixerTasks, maxSubagents);

    for (const f of fixes) {
      const run = personaRuns.find((r) => r.persona === f.persona);
      if (run) run.proposedFix = f.fix;
    }

    phase = "FIXING";
    saveCheckpoint({ runId, packId, phase, personaRuns, totalSubagentsDeployed });
  }

  // 4. Approval Gate Gating & Validation Phase
  if (phase === "FIXING") {
    const fixesToValidate = personaRuns.filter((r) => r.proposedFix?.fixed && r.validationSuccess === undefined);
    if (fixesToValidate.length > 0) {
      // Human-in-the-loop Gate Check
      if (options.approvalGate) {
        const patchesDir = path.resolve("patches");
        if (!fs.existsSync(patchesDir)) {
          fs.mkdirSync(patchesDir, { recursive: true });
        }

        // Save proposed patch diff files for human review
        for (const run of fixesToValidate) {
          const patchFile = path.join(patchesDir, `proposed_patch_${packId}_${run.persona}.patch`);
          fs.writeFileSync(patchFile, run.proposedFix!.applied_patch, "utf-8");
        }

        const signalFile = path.join(patchesDir, `approved_${packId}.signal`);
        if (!fs.existsSync(signalFile)) {
          console.log(
            `🛑 Approval gate active. Proposed patches written to patches/proposed_patch_${packId}_<persona>.patch`
          );
          console.log(`To proceed, approve and create approval signal file: patches/approved_${packId}.signal`);

          return {
            success: false,
            totalSubagentsDeployed,
            concurrencyLimit: maxSubagents,
            personaRuns,
            synthesis: {
              summary: "Orchestration halted: Waiting for human-in-the-loop approval signal.",
              confidence_score: 50,
            },
          };
        }

        console.log(`🟢 Human approval signal found! Proceeding with fix validation...`);
        // Remove signal file so it doesn't linger
        try {
          fs.unlinkSync(signalFile);
        } catch {}
      }

      console.log(`🚀 Validating proposed patches...`);

      const validationTasks = fixesToValidate.map((run) => {
        return async (): Promise<void> => {
          const startTime = Date.now();
          console.log(`🚀 Subagent: Validating proposed fix for persona '${run.persona}'...`);
          totalSubagentsDeployed++;

          const patchedPack = applyStructuredPatch(pack, run.proposedFix!.applied_patch);
          const retestResult = await runAiPlaytest({
            pack: patchedPack,
            client,
            seed: baseSeed,
            traceId: `orchestrated_validation_${run.persona}_${packId}`,
            persona: run.persona,
            maxSteps: 35,
          });

          run.validationSuccess = retestResult.success;

          logTelemetry({
            runId,
            packId,
            role: "playtester",
            persona: run.persona,
            action: "validate_patch",
            durationMs: Date.now() - startTime,
            status: retestResult.success ? "success" : "failure",
            details: retestResult.error,
          });
        };
      });

      await runWithLimit(validationTasks, maxSubagents);
    }

    phase = "COMPLETED";
    saveCheckpoint({ runId, packId, phase, personaRuns, totalSubagentsDeployed });
  }

  // 5. Synthesis Phase
  const allSucceeded = personaRuns.every((r) => r.success || r.validationSuccess);
  console.log(`⚖️ Orchestrator: Synthesizing audit outcomes...`);
  totalSubagentsDeployed++;

  const synthesisStartTime = Date.now();
  const synthesis = await client.completeJson<{
    best_patch?: string;
    summary: string;
    confidence_score: number;
  }>({
    role: "orchestrator",
    system:
      "You are the Lead AI Orchestrator. Synthesize the findings from multiple playtest personas, debugger diagnoses, and proposed fixes, and output the best patch decision.",
    input: {
      pack_id: packId,
      personaRuns: personaRuns.map((r) => ({
        persona: r.persona,
        success: r.success,
        steps: r.steps,
        ending: r.ending,
        issue: r.diagnosis?.diagnosis,
        patch: r.proposedFix?.applied_patch,
        healed: r.validationSuccess,
      })),
    },
    schema: {
      type: "object",
      properties: {
        best_patch: { type: "string" },
        summary: { type: "string" },
        confidence_score: { type: "number" },
      },
      required: ["summary", "confidence_score"],
    },
    seed: baseSeed,
  });

  logTelemetry({
    runId,
    packId,
    role: "orchestrator",
    action: "synthesis",
    durationMs: Date.now() - synthesisStartTime,
    status: "success",
    details: synthesis.summary,
  });

  // Clear checkpoint file upon successful completion
  try {
    const checkpointPath = path.resolve("traces", `orchestrator_checkpoint_${packId}.json`);
    if (fs.existsSync(checkpointPath)) {
      fs.unlinkSync(checkpointPath);
    }
  } catch {}

  return {
    success: allSucceeded,
    totalSubagentsDeployed,
    concurrencyLimit: maxSubagents,
    personaRuns,
    synthesis,
  };
}
