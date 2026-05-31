import { describe, it, expect } from "vitest";
import { MockLlmClient } from "../src/agents/llm/mock_client.js";
import { draftStory } from "../src/agents/writer.js";
import { adaptStoryToPack } from "../src/agents/adapter.js";
import { runAiPlaytest } from "../src/agents/playtester.js";
import { diagnosePlaytest } from "../src/agents/debugger.js";
import { fixIdentifiedBug } from "../src/agents/fixer.js";
import { replayTrace } from "../src/trace/replay.js";
import { step } from "../src/core/engine.js";

describe("AI Agent Roster & Acceptance Loop (Stage 1 MVP)", () => {
  it("should successfully execute the full Writer -> Adapter -> Validator -> Playtester -> Debugger -> Fixer loop", async () => {
    // Initialize mock LLM client
    const client = new MockLlmClient();

    // 1. AI Writer drafts a story draft
    const rawStory = await draftStory({
      client,
      premise: "An ancient ticking gear crypt has restarted.",
      tone: "mysterious",
      seed: 1234,
    });
    expect(rawStory.title).toBe("Mock Adventure: The Clockwork Crypt");
    expect(rawStory.beats.length).toBeGreaterThan(0);

    // 2. AI Adapter adapts raw story beats into schema-valid CYOAPack
    const adaptation = await adaptStoryToPack({
      client,
      story: rawStory,
      packId: "clockwork_crypt_v1",
      seed: 5678,
    });
    expect(adaptation.success).toBe(true);

    const pack = adaptation.pack;
    expect(pack.meta.id).toBe("clockwork_crypt_v1");

    // 3. Run AI Playtester to complete game pathways deterministically
    const playtest = await runAiPlaytest({
      pack,
      client,
      seed: 8888,
      traceId: "tr_playtest_001",
      maxSteps: 20,
    });
    expect(playtest.success).toBe(true);
    expect(playtest.logs.length).toBeGreaterThan(0);

    const endingLog = playtest.logs[playtest.logs.length - 1];
    expect(endingLog.result).toBe("ending"); // Playtest reached a terminal ending

    // 4. Run AI Debugger to diagnose the run
    const diagnosis = await diagnosePlaytest({
      client,
      logs: playtest.logs,
      seed: 9999,
    });
    expect(diagnosis.issue_identified).toBe(true);
    expect(diagnosis.diagnosis).toContain("jam gears");

    // 5. Run AI Fixer to apply a patch
    const fixResult = await fixIdentifiedBug({
      client,
      diagnosis,
      seed: 1111,
    });
    expect(fixResult.fixed).toBe(true);
    expect(fixResult.fix_layer).toBe("content");

    // 6. Verify absolute determinism: Replaying playtest trace reproduces identical state hashes
    const replay = replayTrace({
      trace: playtest.trace,
      stepFn: (state, action) => step(state, action, pack),
      getStartScene: (packId) => {
        expect(packId).toBe(pack.meta.id);
        return {
          start: pack.meta.start,
          varsInit: pack.meta.vars_init,
          flagsInit: pack.meta.flags_init,
        };
      },
    });

    expect(replay.success).toBe(true);
    expect(replay.finalHash).toBe(playtest.trace.expected_final_hash);
  });
});
