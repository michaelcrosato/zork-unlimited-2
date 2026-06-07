import { describe, it, expect } from "vitest";
import { MockLlmClient } from "../src/agents/llm/mock_client.js";
import { runOrchestratedAudit } from "../src/agents/orchestrator.js";
import { CYOAPack } from "../src/cyoa/schema.js";

describe("Multi-Agent Orchestrator", () => {
  it("should successfully coordinate concurrent playtests, debuggers, and fixers", async () => {
    const client = new MockLlmClient();

    // Create a mock CYOAPack
    const pack: CYOAPack = {
      meta: {
        id: "clockwork_crypt_orchestrated",
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

    const report = await runOrchestratedAudit(pack, {
      client,
      maxSubagents: 3,
      personas: ["speedrunner", "explorer", "hoarder"],
      seed: 1234,
    });

    expect(report.success).toBe(true);
    expect(report.concurrencyLimit).toBe(3);
    expect(report.personaRuns.length).toBe(3);
    expect(report.totalSubagentsDeployed).toBeGreaterThanOrEqual(4); // 3 playtester subagents + 1 orchestrator synthesizer
    expect(report.synthesis.confidence_score).toBe(95);
    expect(report.synthesis.best_patch).toBe("Add a warning sign to the room text.");

    // Verify all personas succeeded
    for (const run of report.personaRuns) {
      expect(run.success).toBe(true);
      expect(run.steps).toBeGreaterThan(0);
      expect(run.ending).toBe("victory_glade");
    }
  });

  it("should deploy debugger and fixer subagents when playtests fail", async () => {
    // To trigger playtest failure in the mock client, let's look at how MockLlmClient triggers failure:
    // Actually, MockLlmClient's playtester will normally succeed. Let's write a custom MockLlmClient that fails playtesting.
    // Or we can mock the behavior. But wait, MockLlmClient has mock responses for playtesting.
    // Wait, how does MockLlmClient handle playtest failures?
    // Let's inspect mock_client.ts or customize our client.
    // Wait! Let's define a mock client that inherits from LlmClient or uses a simple object wrapper.
    const customClient = {
      async completeJson<T>(request: {
        role: "writer" | "adapter" | "playtester" | "debugger" | "fixer" | "orchestrator";
        system: string;
        input: any;
        schema: any;
        seed?: number;
      }): Promise<T> {
        if (request.role === "playtester") {
          // Return an action that is NOT in the scene, which will trigger a playtest failure!
          return {
            chosen_action_id: "non_existent_action",
            reason: "Mock failure trigger",
            expected_result: "This should fail",
          } as unknown as T;
        }

        if (request.role === "debugger") {
          return {
            issue_identified: true,
            diagnosis: "Failed playtest on purpose",
            severity: "high",
            recommendation: "Provide a mock fix",
          } as unknown as T;
        }

        if (request.role === "fixer") {
          return {
            fixed: true,
            fix_layer: "content",
            applied_patch: "Fixed on purpose",
            regression_test_name: "test_failure_mock",
          } as unknown as T;
        }

        if (request.role === "orchestrator") {
          return {
            best_patch: "Fixed on purpose",
            summary: "Successfully healed the failure",
            confidence_score: 99,
          } as unknown as T;
        }

        throw new Error(`Unsupported role in test: ${request.role}`);
      },
    };

    const pack: CYOAPack = {
      meta: {
        id: "failure_pack",
        title: "Failure Pack",
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
      ],
      endings: [],
    };

    const report = await runOrchestratedAudit(pack, {
      client: customClient,
      maxSubagents: 2,
      personas: ["speedrunner", "explorer"],
      seed: 9999,
    });

    // It should have triggered debugging and fixing
    expect(report.success).toBe(false); // Since playtest failed and retest also failed (retrying playtest with same failure client returns failure)
    // Persona 1: speedrunner (playtest fail) -> debugger -> fixer -> validation playtest
    // Persona 2: explorer (playtest fail) -> debugger -> fixer -> validation playtest
    // Synthesizer: runs once.
    // Total: 2 (playtest) + 2 (debugger) + 2 (fixer) + 2 (validator) + 1 (orchestrator) = 9
    // Wait! Let's check why total is 9:
    // Let's print or expect totalSubagentsDeployed to be 9.
    expect(report.totalSubagentsDeployed).toBe(9);
    expect(report.personaRuns[0].diagnosis?.diagnosis).toBe("Failed playtest on purpose");
    expect(report.personaRuns[0].proposedFix?.applied_patch).toBe("Fixed on purpose");
    expect(report.synthesis.confidence_score).toBe(99);
  });
});
