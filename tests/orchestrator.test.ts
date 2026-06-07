import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MockLlmClient } from "../src/agents/llm/mock_client.js";
import { runOrchestratedAudit } from "../src/agents/orchestrator.js";
import { CYOAPack } from "../src/cyoa/schema.js";
import * as fs from "fs";
import * as path from "path";

describe("Multi-Agent Orchestrator (Production-Grade)", () => {
  const packId = "clockwork_crypt_orchestrated";
  const checkpointFile = path.resolve("traces", `orchestrator_checkpoint_${packId}.json`);
  const telemetryFile = path.resolve("traces", "orchestrator_runs.jsonl");
  const patchFile = path.resolve("patches", `proposed_patch_${packId}_explorer.patch`);
  const signalFile = path.resolve("patches", `approved_${packId}.signal`);

  const mockPack: CYOAPack = {
    meta: {
      id: packId,
      title: "The Orchestrated Clockwork Crypt",
      start: "entrance",
      vars_init: {},
      flags_init: [],
    },
    scenes: [
      {
        id: "entrance",
        title: "Crypt Entrance",
        text: "You stand before a large brass gate.",
        choices: [
          {
            id: "open_gate",
            text: "Open the gate",
            next: "victory_glade",
          },
        ],
      },
      {
        id: "victory_glade",
        title: "Victory Glade",
        text: "You escaped the crypt!",
        is_ending: true,
      },
    ],
    endings: [
      {
        id: "ending_victory",
        title: "Victory Ending",
        text: "You won!",
      },
    ],
  };

  beforeEach(() => {
    // Clean files
    try {
      if (fs.existsSync(checkpointFile)) fs.unlinkSync(checkpointFile);
      if (fs.existsSync(telemetryFile)) fs.unlinkSync(telemetryFile);
      if (fs.existsSync(patchFile)) fs.unlinkSync(patchFile);
      if (fs.existsSync(signalFile)) fs.unlinkSync(signalFile);
    } catch (err) {}
  });

  afterEach(() => {
    // Cleanup files
    try {
      if (fs.existsSync(checkpointFile)) fs.unlinkSync(checkpointFile);
      if (fs.existsSync(telemetryFile)) fs.unlinkSync(telemetryFile);
      if (fs.existsSync(patchFile)) fs.unlinkSync(patchFile);
      if (fs.existsSync(signalFile)) fs.unlinkSync(signalFile);
    } catch (err) {}
  });

  it("should output telemetry logs to traces/orchestrator_runs.jsonl", async () => {
    const client = new MockLlmClient();

    const report = await runOrchestratedAudit(mockPack, {
      client,
      maxSubagents: 2,
      personas: ["speedrunner", "explorer"],
      seed: 1234,
      runId: "telemetry_test_run",
    });

    expect(report.success).toBe(true);
    expect(fs.existsSync(telemetryFile)).toBe(true);

    const logLines = fs.readFileSync(telemetryFile, "utf-8").trim().split("\n");
    expect(logLines.length).toBeGreaterThanOrEqual(3); // 2 playtests + 1 synthesis

    const firstLog = JSON.parse(logLines[0]);
    expect(firstLog.runId).toBe("telemetry_test_run");
    expect(firstLog.packId).toBe(packId);
    expect(firstLog.role).toBe("playtester");
  });

  it("should save checkpoints and resume execution cleanly", async () => {
    // To test checkpoint resume, let's trigger a failure to create checkpoint during a middle phase
    const customClient = {
      callCount: 0,
      async completeJson<T>(request: {
        role: "writer" | "adapter" | "playtester" | "debugger" | "fixer" | "orchestrator";
        system: string;
        input: any;
        schema: any;
      }): Promise<T> {
        this.callCount++;
        if (request.role === "playtester") {
          return {
            chosen_action_id: "open_gate",
            reason: "Mock playtest step",
            expected_result: "Goes to next scene",
          } as unknown as T;
        }
        if (request.role === "orchestrator") {
          return {
            summary: "Completed successfully",
            confidence_score: 95,
          } as unknown as T;
        }
        throw new Error("Unexpected role call");
      },
    };

    // First execution
    const runId = "checkpoint_test_run";
    const report1 = await runOrchestratedAudit(mockPack, {
      client: customClient,
      maxSubagents: 2,
      personas: ["speedrunner", "explorer"],
      seed: 1234,
      runId,
    });

    expect(report1.success).toBe(true);
    // Since checkpoint completes, checkpoint file is cleared.
    expect(fs.existsSync(checkpointFile)).toBe(false);

    // Let's manually write a checkpoint to test load & resume
    const manualCheckpointData = {
      runId,
      packId,
      phase: "PLAYTESTING" as const,
      personaRuns: [
        { persona: "speedrunner", success: false, steps: 5, ending: "entrance", error: "Stuck" },
        { persona: "explorer", success: true, steps: 10, ending: "victory_glade" },
      ],
      totalSubagentsDeployed: 2,
    };
    fs.writeFileSync(checkpointFile, JSON.stringify(manualCheckpointData, null, 2), "utf-8");

    // Re-run with custom client that handles debugger/fixer/synthesis
    const customClient2 = {
      diagnoseCalled: false,
      fixCalled: false,
      async completeJson<T>(request: {
        role: "writer" | "adapter" | "playtester" | "debugger" | "fixer" | "orchestrator";
        system: string;
        input: any;
        schema: any;
      }): Promise<T> {
        if (request.role === "debugger") {
          this.diagnoseCalled = true;
          return {
            issue_identified: true,
            diagnosis: "Test diagnosis",
            severity: "high",
            recommendation: "Test recommendation",
          } as unknown as T;
        }
        if (request.role === "fixer") {
          this.fixCalled = true;
          return {
            fixed: true,
            fix_layer: "content",
            applied_patch: "Test fix patch",
            regression_test_name: "test_warning",
          } as unknown as T;
        }
        if (request.role === "playtester") {
          // Validation test succeeds
          return {
            chosen_action_id: "open_gate",
            reason: "Healed",
            expected_result: "Healed",
          } as unknown as T;
        }
        if (request.role === "orchestrator") {
          return {
            best_patch: "Test fix patch",
            summary: "Healed successfully",
            confidence_score: 95,
          } as unknown as T;
        }
        throw new Error(`Unexpected role: ${request.role}`);
      },
    };

    const report2 = await runOrchestratedAudit(mockPack, {
      client: customClient2,
      maxSubagents: 2,
      personas: ["speedrunner", "explorer"],
      seed: 1234,
      runId,
    });

    expect(report2.success).toBe(true);
    expect(customClient2.diagnoseCalled).toBe(true);
    expect(customClient2.fixCalled).toBe(true);
    expect(report2.personaRuns[0].validationSuccess).toBe(true); // Retest succeeded
    expect(report2.synthesis.best_patch).toBe("Test fix patch");
  });

  it("should halt at the Human-in-the-Loop approval gate and proceed upon approval", async () => {
    const customClient = {
      async completeJson<T>(request: {
        role: "writer" | "adapter" | "playtester" | "debugger" | "fixer" | "orchestrator";
        system: string;
        input: any;
        schema: any;
      }): Promise<T> {
        if (request.role === "playtester") {
          // Playtest fails
          return {
            chosen_action_id: "invalid_choice",
            reason: "Failure trigger",
            expected_result: "Fail",
          } as unknown as T;
        }
        if (request.role === "debugger") {
          return {
            issue_identified: true,
            diagnosis: "Test diagnosis",
            severity: "high",
            recommendation: "Test recommendation",
          } as unknown as T;
        }
        if (request.role === "fixer") {
          return {
            fixed: true,
            fix_layer: "content",
            applied_patch: "Proposed diff",
            regression_test_name: "test_warning",
          } as unknown as T;
        }
        throw new Error("Unexpected call");
      },
    };

    const runId = "hitl_gating_test_run";

    // Run first time with approval gate enabled
    const report1 = await runOrchestratedAudit(mockPack, {
      client: customClient,
      maxSubagents: 1,
      personas: ["explorer"],
      seed: 5555,
      runId,
      approvalGate: true,
    });

    // It should halt and return success = false and summary waiting for approval
    expect(report1.success).toBe(false);
    expect(report1.synthesis.summary).toBe("Orchestration halted: Waiting for human-in-the-loop approval signal.");
    expect(fs.existsSync(patchFile)).toBe(true);
    expect(fs.readFileSync(patchFile, "utf-8")).toBe("Proposed diff");

    // The checkpoint file should exist at FIXING phase
    expect(fs.existsSync(checkpointFile)).toBe(true);
    const savedCheckpoint = JSON.parse(fs.readFileSync(checkpointFile, "utf-8"));
    expect(savedCheckpoint.phase).toBe("FIXING");

    // Now, create the approval signal file and rerun
    fs.writeFileSync(signalFile, "APPROVED", "utf-8");

    const customClient2 = {
      async completeJson<T>(request: {
        role: "writer" | "adapter" | "playtester" | "debugger" | "fixer" | "orchestrator";
        system: string;
        input: any;
        schema: any;
      }): Promise<T> {
        if (request.role === "playtester") {
          // Validation passes!
          return {
            chosen_action_id: "open_gate",
            reason: "Fixed validation",
            expected_result: "Success",
          } as unknown as T;
        }
        if (request.role === "orchestrator") {
          return {
            best_patch: "Proposed diff",
            summary: "Healed after approval",
            confidence_score: 99,
          } as unknown as T;
        }
        throw new Error(`Unexpected call: ${request.role}`);
      },
    };

    const report2 = await runOrchestratedAudit(mockPack, {
      client: customClient2,
      maxSubagents: 1,
      personas: ["explorer"],
      seed: 5555,
      runId,
      approvalGate: true,
    });

    expect(report2.success).toBe(true);
    expect(report2.personaRuns[0].validationSuccess).toBe(true);
    expect(report2.synthesis.summary).toBe("Healed after approval");
    // Signal file is deleted automatically
    expect(fs.existsSync(signalFile)).toBe(false);
    // Checkpoint is cleared automatically
    expect(fs.existsSync(checkpointFile)).toBe(false);
  });
});
