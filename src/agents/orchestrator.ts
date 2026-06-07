import { LlmClient } from "./llm/client.js";
import { runAiPlaytest, PlaytestResult } from "./playtester.js";
import { diagnosePlaytest, BugDiagnosis } from "./debugger.js";
import { fixIdentifiedBug, ContentFixResult } from "./fixer.js";
import { CYOAPack } from "../cyoa/schema.js";
import { ParserPack } from "../parser/schema.js";

export interface OrchestratorOptions {
  client: LlmClient;
  maxSubagents?: number; // Maximum number of concurrent subagents we can deploy
  personas?: string[]; // Personas to deploy (e.g. speedrunner, explorer, hoarder, dropper, mainline)
  seed?: number;
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
        // Capture task error
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

  console.log(`🌀 Orchestrator: Initiating content audit for pack '${pack.meta.id}'`);
  console.log(`👥 Deploying up to ${maxSubagents} concurrent subagent tasks...`);

  let totalSubagentsDeployed = 0;

  // 1. Playtesting Phase: Run all personas concurrently with limited concurrency
  const playtestTasks = personas.map((persona, index) => {
    return async (): Promise<{ persona: string; result: PlaytestResult }> => {
      console.log(`🕵️ Subagent: Starting playtest persona '${persona}'...`);
      totalSubagentsDeployed++;
      const result = await runAiPlaytest({
        pack,
        client,
        seed: baseSeed + index,
        traceId: `orchestrated_${persona}_${pack.meta.id}`,
        persona,
        maxSteps: 35,
      });
      return { persona, result };
    };
  });

  const playtestOutcomes = await runWithLimit(playtestTasks, maxSubagents);

  const personaRuns: PersonaRunResult[] = playtestOutcomes.map(({ persona, result }) => ({
    persona,
    success: result.success,
    steps: result.logs.length,
    ending: result.finalState.endingId || result.finalState.current,
    error: result.error,
  }));

  // 2. Diagnosis and Fixing Phase
  // Identify failures
  const failedRuns = playtestOutcomes.filter((o) => !o.result.success);

  if (failedRuns.length > 0) {
    console.log(
      `⚠️ ${failedRuns.length} playtest personas encountered failures or soft-locks. Deploying Debugger & Fixer subagents...`
    );

    // Diagnoses tasks
    const diagnosisTasks = failedRuns.map(({ persona, result }) => {
      return async (): Promise<{ persona: string; diagnosis: BugDiagnosis }> => {
        console.log(`🔍 Subagent: Diagnosing failure for persona '${persona}'...`);
        totalSubagentsDeployed++;
        const diagnosis = await diagnosePlaytest({
          client,
          logs: result.logs,
          seed: baseSeed,
        });
        return { persona, diagnosis };
      };
    });

    const diagnoses = await runWithLimit(diagnosisTasks, maxSubagents);

    // Map diagnoses back to personaRuns
    for (const d of diagnoses) {
      const run = personaRuns.find((r) => r.persona === d.persona);
      if (run) run.diagnosis = d.diagnosis;
    }

    // Fixer tasks (run only for diagnosed issues)
    const fixerTasks = diagnoses
      .filter((d) => d.diagnosis.issue_identified)
      .map(({ persona, diagnosis }) => {
        return async (): Promise<{ persona: string; fix: ContentFixResult }> => {
          console.log(`🩹 Subagent: Generating fix for persona '${persona}'...`);
          totalSubagentsDeployed++;
          const fix = await fixIdentifiedBug({
            client,
            diagnosis,
            seed: baseSeed,
          });
          return { persona, fix };
        };
      });

    const fixes = await runWithLimit(fixerTasks, maxSubagents);

    // Map fixes back to personaRuns and launch validation tasks
    const validationTasks: (() => Promise<void>)[] = [];

    for (const f of fixes) {
      const run = personaRuns.find((r) => r.persona === f.persona);
      if (run) {
        run.proposedFix = f.fix;

        if (f.fix.fixed) {
          validationTasks.push(async () => {
            console.log(`🚀 Subagent: Validating fix proposed for persona '${f.persona}'...`);
            totalSubagentsDeployed++;
            // Re-run the playtest to validate the fix
            const retestResult = await runAiPlaytest({
              pack,
              client,
              seed: baseSeed,
              traceId: `orchestrated_validation_${f.persona}_${pack.meta.id}`,
              persona: f.persona,
              maxSteps: 35,
            });
            run.validationSuccess = retestResult.success;
          });
        }
      }
    }

    if (validationTasks.length > 0) {
      await runWithLimit(validationTasks, maxSubagents);
    }
  } else {
    console.log("🟢 All playtest personas completed successfully. No fixes needed.");
  }

  // 3. Synthesis Phase: Orchestrator consolidates all results
  const allSucceeded = personaRuns.every((r) => r.success || r.validationSuccess);
  console.log(`⚖️ Orchestrator: Synthesizing results and finalizing report...`);
  totalSubagentsDeployed++;

  const synthesis = await client.completeJson<{
    best_patch?: string;
    summary: string;
    confidence_score: number;
  }>({
    role: "orchestrator",
    system:
      "You are the Lead AI Orchestrator. Synthesize the findings from multiple playtest personas, debugger diagnoses, and proposed fixes, and output the best patch decision.",
    input: {
      pack_id: pack.meta.id,
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

  return {
    success: allSucceeded,
    totalSubagentsDeployed,
    concurrencyLimit: maxSubagents,
    personaRuns,
    synthesis,
  };
}
