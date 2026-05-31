import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { parse as parseYaml } from "yaml";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep, buildObservationForAgent } from "../src/core/sync.js";
import { computeStateHash } from "../src/index.js";

const packPath = fileURLToPath(new URL("../content/parser/pack/multiplayer_forest.yaml", import.meta.url));
const pack = parseYaml(readFileSync(packPath, "utf8"));

describe("Multi-Agent Telemetry & Real-Time Sync Tests", () => {
  it("should dynamically register agents on the fly", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
      flagsInit: pack.meta.flags_init,
      varsInit: pack.meta.vars_init,
    });

    expect(state.agents).toBeUndefined();

    // Trigger an action for agent_alpha
    const res = multiAgentStep(
      state,
      {
        agentId: "agent_alpha",
        action: { type: "LOOK" },
      },
      pack
    );

    expect(res.ok).toBe(true);
    expect(res.state.agents).toBeDefined();
    expect(res.state.agents!["agent_alpha"]).toBeDefined();
    expect(res.state.agents!["agent_alpha"].current).toBe("clearing");
    expect(res.state.agents!["agent_alpha"].inventory).toEqual([]);
  });

  it("should maintain separate locations and inventories for cooperative agents", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
      agentsInit: ["explorer_alpha", "helper_beta"],
      flagsInit: pack.meta.flags_init,
      varsInit: pack.meta.vars_init,
    });

    expect(state.agents!["explorer_alpha"].current).toBe("clearing");
    expect(state.agents!["helper_beta"].current).toBe("clearing");

    // Move explorer_alpha west
    const res1 = multiAgentStep(
      state,
      {
        agentId: "explorer_alpha",
        action: { type: "MOVE", direction: "west" },
      },
      pack
    );
    expect(res1.ok).toBe(true);
    state = res1.state;

    // explorer_alpha is in control_room, helper_beta is still in clearing
    expect(state.agents!["explorer_alpha"].current).toBe("control_room");
    expect(state.agents!["helper_beta"].current).toBe("clearing");

    // helper_beta gets a clearing-focused observation
    const obsBeta = buildObservationForAgent(state, pack, "helper_beta");
    expect(obsBeta.mode).toBe("parser");
    if (obsBeta.mode === "parser") {
      expect(obsBeta.room).toBe("clearing");
    }

    // explorer_alpha gets a control_room-focused observation
    const obsAlpha = buildObservationForAgent(state, pack, "explorer_alpha");
    expect(obsAlpha.mode).toBe("parser");
    if (obsAlpha.mode === "parser") {
      expect(obsAlpha.room).toBe("control_room");
    }
  });

  it("should successfully solve a cooperative puzzle and complete the game", () => {
    let state = createInitialState({
      seed: 1234,
      start: "clearing",
      agentsInit: ["explorer_alpha", "helper_beta"],
      flagsInit: pack.meta.flags_init,
      varsInit: pack.meta.vars_init,
    });

    // 1. explorer_alpha moves to control room
    let res = multiAgentStep(
      state,
      {
        agentId: "explorer_alpha",
        action: { type: "MOVE", direction: "west" },
      },
      pack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // 2. explorer_alpha pulls the lever
    res = multiAgentStep(
      state,
      {
        agentId: "explorer_alpha",
        action: { type: "USE", item: "lever", target: "lever" },
      },
      pack
    );
    if (!res.ok) {
      console.log("PUZZLE STEP 2 FAILED. REASON:", res.rejectionReason, "EVENTS:", res.events);
    }
    expect(res.ok).toBe(true);
    state = res.state;
    // Assert cage is now unlocked globally
    expect(state.flags["cage_locked"]).toBe(false);

    // 3. helper_beta (still in clearing) opens the cage
    res = multiAgentStep(
      state,
      {
        agentId: "helper_beta",
        action: { type: "OPEN", target: "cage" },
      },
      pack
    );
    if (!res.ok) {
      console.log("PUZZLE STEP 3 FAILED. REASON:", res.rejectionReason, "EVENTS:", res.events);
    }
    expect(res.ok).toBe(true);
    state = res.state;

    // 4. helper_beta takes the vault key
    res = multiAgentStep(
      state,
      {
        agentId: "helper_beta",
        action: { type: "TAKE", item: "vault_key" },
      },
      pack
    );
    if (!res.ok) {
      console.log("PUZZLE STEP 4 FAILED. REASON:", res.rejectionReason, "EVENTS:", res.events);
    }
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.agents!["helper_beta"].inventory).toContain("vault_key");
    expect(state.agents!["explorer_alpha"].inventory).not.toContain("vault_key");

    // 5. helper_beta uses vault key on vault door
    res = multiAgentStep(
      state,
      {
        agentId: "helper_beta",
        action: { type: "USE", item: "vault_key", target: "vault_door" },
      },
      pack
    );
    if (!res.ok) {
      console.log("PUZZLE STEP 5 FAILED. REASON:", res.rejectionReason, "EVENTS:", res.events);
    }
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.flags["vault_door_locked"]).toBe(false);

    // 6. helper_beta moves east to treasure chamber
    res = multiAgentStep(
      state,
      {
        agentId: "helper_beta",
        action: { type: "MOVE", direction: "east" },
      },
      pack
    );
    if (!res.ok) {
      console.log("PUZZLE STEP 6 FAILED. REASON:", res.rejectionReason, "EVENTS:", res.events);
    }
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.agents!["helper_beta"].current).toBe("treasure_chamber");

    // 7. helper_beta takes the treasure, achieving victory!
    res = multiAgentStep(
      state,
      {
        agentId: "helper_beta",
        action: { type: "TAKE", item: "treasure" },
      },
      pack
    );
    if (!res.ok) {
      console.log("PUZZLE STEP 7 FAILED. REASON:", res.rejectionReason, "EVENTS:", res.events);
    }
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.ended).toBe(true);
    expect(state.endingId).toBe("ending_victory");
  });

  it("should enforce optimistic locking via sequence number and state hash checks", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
      agentsInit: ["explorer_alpha", "helper_beta"],
      flagsInit: pack.meta.flags_init,
      varsInit: pack.meta.vars_init,
    });

    const expectedHash = computeStateHash(state);

    // Alpha acts at sequence 0 -> SUCCESS
    let res = multiAgentStep(
      state,
      {
        agentId: "explorer_alpha",
        action: { type: "LOOK" },
        expectedSequenceNumber: 0,
        expectedStateHash: expectedHash,
      },
      pack
    );
    expect(res.ok).toBe(true);
    const updatedState = res.state;

    // Beta attempts to act at sequence 0 -> REJECTED (optimistic locking conflict)
    let resConflict = multiAgentStep(
      updatedState,
      {
        agentId: "helper_beta",
        action: { type: "LOOK" },
        expectedSequenceNumber: 0, // stale sequence
        expectedStateHash: expectedHash, // stale hash
      },
      pack
    );
    expect(resConflict.ok).toBe(false);
    expect(resConflict.rejectionReason).toContain("locking conflict");

    // Beta acts at correct sequence 1 -> SUCCESS
    let resBetaCorrect = multiAgentStep(
      updatedState,
      {
        agentId: "helper_beta",
        action: { type: "LOOK" },
        expectedSequenceNumber: 1,
      },
      pack
    );
    expect(resBetaCorrect.ok).toBe(true);
  });

  it("should record comprehensive telemetry inside the transaction journal", () => {
    let state = createInitialState({
      seed: 999,
      start: "clearing",
      agentsInit: ["explorer_alpha"],
      flagsInit: pack.meta.flags_init,
      varsInit: pack.meta.vars_init,
    });

    // Run successful action
    let res = multiAgentStep(
      state,
      {
        agentId: "explorer_alpha",
        action: { type: "LOOK" },
      },
      pack
    );
    state = res.state;

    // Run rejected action
    res = multiAgentStep(
      state,
      {
        agentId: "explorer_alpha",
        action: { type: "TAKE", item: "invalid_item" },
      },
      pack
    );
    state = res.state;

    expect(state.transactionJournal).toHaveLength(2);
    
    // Check successful transaction
    const t0 = state.transactionJournal![0];
    expect(t0.agentId).toBe("explorer_alpha");
    expect(t0.sequenceNumber).toBe(0);
    expect(t0.action.type).toBe("LOOK");
    expect(t0.ok).toBe(true);
    expect(t0.stateHashBefore).toBeDefined();
    expect(t0.stateHashAfter).toBeDefined();

    // Check rejected transaction
    const t1 = state.transactionJournal![1];
    expect(t1.agentId).toBe("explorer_alpha");
    expect(t1.sequenceNumber).toBe(1);
    expect(t1.action.type).toBe("TAKE");
    expect(t1.ok).toBe(false);
    expect(t1.rejectionReason).toBeDefined();
  });
});
