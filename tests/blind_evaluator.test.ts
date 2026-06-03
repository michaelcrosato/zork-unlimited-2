import { describe, it, expect } from "vitest";
import { MockLlmClient } from "../src/agents/llm/mock_client.js";
import { runBlindEvaluation, AnonymizedCandidate } from "../src/agents/blind_evaluator.js";

describe("Double-Blind Playtest Evaluator Protocol", () => {
  it("should successfully execute a double-blind playtest evaluation and decrypt the winner", async () => {
    // 1. Initialize our mock LLM client
    const client = new MockLlmClient();

    // 2. Prepare mock candidates with different playtest trajectories
    const candidateA: AnonymizedCandidate = {
      candidateId: "speedrunner_v1.0",
      logs: [
        {
          step: 1,
          location: "Sunlit Clearing",
          available_actions: ["shovel", "mound"],
          chosen_action_id: "shovel",
          reason: "Needs tool to dig",
          expected: "picks up shovel",
          actual_effects: ["taken"],
          result: "progress",
        },
        {
          step: 2,
          location: "Sunlit Clearing",
          available_actions: ["mound"],
          chosen_action_id: "mound",
          reason: "Clear path",
          expected: "passage opens",
          actual_effects: ["passage_unlocked"],
          result: "progress",
        },
        {
          step: 3,
          location: "Hidden Glade",
          available_actions: [],
          chosen_action_id: "",
          reason: "Win ending reached",
          expected: "victory scene",
          actual_effects: [],
          result: "ending",
        },
      ],
      trace: {
        trace_id: "tr_speedrun_01",
        pack_id: "unlimited_forest_pack",
        content_hash: "hash_01",
        seed: 42,
        initial_state_ref: "start",
        actions: [],
        expected_final_hash: "hash_final_1",
      },
    };

    const candidateB: AnonymizedCandidate = {
      candidateId: "chatty_explorer_v2.1",
      logs: [
        {
          step: 1,
          location: "Sunlit Clearing",
          available_actions: ["shovel"],
          chosen_action_id: "shovel",
          reason: "Grab tool",
          expected: "shovel taken",
          actual_effects: ["taken"],
          result: "progress",
        },
        {
          step: 2,
          location: "Deep Forest",
          available_actions: ["goblin"],
          chosen_action_id: "goblin",
          reason: "Exhaust dialogue tree",
          expected: "greetings from goblin",
          actual_effects: ["talk_initiated"],
          result: "progress",
        },
        {
          step: 3,
          location: "Deep Forest",
          available_actions: ["goblin_ring_buy"],
          chosen_action_id: "goblin_ring_buy",
          reason: "Investigate items",
          expected: "purchases ring",
          actual_effects: ["gold_reduced_30"],
          result: "progress",
        },
        {
          step: 4,
          location: "Deep Forest",
          available_actions: ["goblin_ring_sell"],
          chosen_action_id: "goblin_ring_sell",
          reason: "Test sell mechanics",
          expected: "sells ring back",
          actual_effects: ["gold_increased_15"],
          result: "progress",
        },
        {
          step: 5,
          location: "Sunlit Clearing",
          available_actions: ["mound"],
          chosen_action_id: "mound",
          reason: "Proceed to glade",
          expected: "opening appears",
          actual_effects: ["passage_unlocked"],
          result: "progress",
        },
        {
          step: 6,
          location: "Hidden Glade",
          available_actions: [],
          chosen_action_id: "",
          reason: "Win ending reached",
          expected: "victory scene",
          actual_effects: [],
          result: "ending",
        },
      ],
      trace: {
        trace_id: "tr_explore_02",
        pack_id: "unlimited_forest_pack",
        content_hash: "hash_01",
        seed: 42,
        initial_state_ref: "start",
        actions: [],
        expected_final_hash: "hash_final_2",
      },
    };

    // 3. Conduct double-blind A/B evaluation sweep
    const evalResult = await runBlindEvaluation({
      candidateA,
      candidateB,
      client,
      seed: 9999,
    });

    expect(evalResult.success).toBe(true);
    expect(["alpha", "beta", "tie"]).toContain(evalResult.blindedWinnerKey);
    expect(evalResult.alphaScore.effectiveness).toBeGreaterThanOrEqual(0);
    expect(evalResult.betaScore.efficiency).toBeGreaterThanOrEqual(0);

    // Assert decryption correctly logs the candidate IDs
    expect(evalResult.decryptionLog).toContain("Blind Decryption:");
    expect(evalResult.decryptionLog).toContain("speedrunner_v1.0");
    expect(evalResult.decryptionLog).toContain("chatty_explorer_v2.1");
  });
});
