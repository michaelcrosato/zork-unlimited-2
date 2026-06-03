import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";
import { tickProductionLabs } from "../src/core/engine.js";

describe("Crime Syndicate Informants & Undercover Agent Interrogation (AF-63)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "informant_test_pack",
      title: "Informant and Interrogation Test Pack",
      start_room: "safehouse_room",
      vars_init: { gold: 1000, hp: 20, max_hp: 20 },
      flags_init: [],
    },
    rooms: [
      {
        id: "safehouse_room",
        name: "Syndicate Safehouse Room",
        description: "A secure safehouse room.",
        objects: [],
        npcs: [],
        exits: [
          {
            direction: "NORTH",
            to: "front_room",
          },
        ],
      },
      {
        id: "front_room",
        name: "Front Business Room",
        description: "A front business laundering money.",
        objects: [],
        npcs: [],
        exits: [
          {
            direction: "SOUTH",
            to: "safehouse_room",
          },
        ],
      },
    ],
    objects: [],
    npcs: [],
  });

  it("should handle BRIBE_ENFORCER action transitions and enforce gold checks", () => {
    let state = createInitialState({
      seed: 42,
      start: "safehouse_room",
      varsInit: { gold: 50, gold_agent_a: 500 },
      agentsInit: ["agent_a"],
    });

    state.syndicates = {
      syndicate_black: {
        id: "syndicate_black",
        name: "Black Syndicate",
        members: ["agent_a"],
        definedBy: "agent_a",
        timestamp: 1000,
      },
    };

    state.enforcers = {
      enforcer_bob: {
        id: "enforcer_bob",
        name: "Officer Bob",
        currentRoom: "front_room",
        status: "defeated",
        isBountyHunter: false,
        timestamp: 1000,
      },
    };

    // 1. Rejected if non-member attempts to bribe
    const nonMemberCheck = multiAgentStep(
      state,
      {
        agentId: "agent_b",
        action: {
          type: "BRIBE_ENFORCER",
          enforcerId: "enforcer_bob",
          syndicateId: "syndicate_black",
          timestamp: 1001,
        } as any,
      },
      mockPack
    );
    expect(nonMemberCheck.ok).toBe(false);
    expect(nonMemberCheck.rejectionReason).toContain("is not a member of syndicate");

    // 2. Rejected if enforcer is not defeated
    state.enforcers.enforcer_bob.status = "idle";
    const nonDefeatedCheck = multiAgentStep(
      state,
      {
        agentId: "agent_a",
        action: {
          type: "BRIBE_ENFORCER",
          enforcerId: "enforcer_bob",
          syndicateId: "syndicate_black",
          timestamp: 1001,
        } as any,
      },
      mockPack
    );
    expect(nonDefeatedCheck.ok).toBe(false);
    expect(nonDefeatedCheck.rejectionReason).toContain("is not defeated");

    // 3. Succeeded bribe when enforcer is defeated and agent has enough gold
    state.enforcers.enforcer_bob.status = "defeated";
    const successBribe = multiAgentStep(
      state,
      {
        agentId: "agent_a",
        action: {
          type: "BRIBE_ENFORCER",
          enforcerId: "enforcer_bob",
          syndicateId: "syndicate_black",
          goldCost: 100,
          timestamp: 1001,
        } as any,
      },
      mockPack
    );

    expect(successBribe.ok).toBe(true);
    // Gold deducted: 500 - 100 = 400
    expect(successBribe.state.vars["gold_agent_a"]).toBe(400);
    // Informant created
    const informant = successBribe.state.informants?.["enforcer_bob"];
    expect(informant).toBeDefined();
    expect(informant?.status).toBe("active");
    expect(informant?.syndicateId).toBe("syndicate_black");
    expect(informant?.bribeCost).toBe(100);
  });

  it("should handle INTERROGATE_ENFORCER and generate pre-emptive raid warnings", () => {
    let state = createInitialState({
      seed: 42,
      start: "safehouse_room",
      varsInit: { gold: 100 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      syndicate_black: {
        id: "syndicate_black",
        name: "Black Syndicate",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
      },
    };

    state.safehouses = {
      safehouse_room: {
        id: "safehouse_safehouse_room",
        roomId: "safehouse_room",
        ownerId: "player",
        syndicateId: "syndicate_black",
        level: 1,
        stashCapacity: 10,
        stashItems: ["stashed_contraband_1"],
        timestamp: 1000,
      },
    };

    state.enforcers = {
      enforcer_bob: {
        id: "enforcer_bob",
        name: "Officer Bob",
        currentRoom: "front_room",
        status: "defeated",
        isBountyHunter: false,
        timestamp: 1000,
      },
    };

    const successInterrogation = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "INTERROGATE_ENFORCER",
          enforcerId: "enforcer_bob",
          syndicateId: "syndicate_black",
          timestamp: 1001,
        } as any,
      },
      mockPack
    );

    expect(successInterrogation.ok).toBe(true);
    // Informant created as compromised
    const informant = successInterrogation.state.informants?.["enforcer_bob"];
    expect(informant).toBeDefined();
    expect(informant?.status).toBe("compromised");

    // Pre-emptive raid warning scheduled
    const warnings = Object.values(successInterrogation.state.raidWarnings ?? {});
    expect(warnings.length).toBe(1);
    const warning = warnings[0];
    expect(warning.roomId).toBe("safehouse_room");
    expect(warning.scheduledStep).toBe(state.step + 5);
    expect(warning.active).toBe(true);
  });

  it("should handle RECRUIT_ENFORCER action and enforce dominance checks", () => {
    let state = createInitialState({
      seed: 42,
      start: "safehouse_room",
      varsInit: { gold: 100 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      syndicate_black: {
        id: "syndicate_black",
        name: "Black Syndicate",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 40, // Too low
      },
    };

    state.enforcers = {
      enforcer_bob: {
        id: "enforcer_bob",
        name: "Officer Bob",
        currentRoom: "front_room",
        status: "defeated",
        isBountyHunter: false,
        timestamp: 1000,
      },
    };

    // 1. Rejected due to low dominance
    const failedRecruit = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "RECRUIT_ENFORCER",
          enforcerId: "enforcer_bob",
          syndicateId: "syndicate_black",
          timestamp: 1001,
        } as any,
      },
      mockPack
    );
    expect(failedRecruit.ok).toBe(false);
    expect(failedRecruit.rejectionReason).toContain("dominance of at least 50");

    // 2. Succeeds when dominance is >= 50
    state.syndicates.syndicate_black.dominance = 60;
    const successRecruit = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "RECRUIT_ENFORCER",
          enforcerId: "enforcer_bob",
          syndicateId: "syndicate_black",
          timestamp: 1001,
        } as any,
      },
      mockPack
    );

    expect(successRecruit.ok).toBe(true);
    const informant = successRecruit.state.informants?.["enforcer_bob"];
    expect(informant).toBeDefined();
    expect(informant?.status).toBe("exposed");
  });

  it("should periodically tick active informants and schedule raid warnings", () => {
    let seed = 42;
    for (let s = 1; s <= 200; s++) {
      const nextSeed = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(nextSeed ^ (nextSeed >>> 15), nextSeed | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      const intVal = Math.floor(value * 100) + 1;
      if (intVal <= 30) {
        seed = s;
        break;
      }
    }

    let state = createInitialState({
      seed,
      start: "safehouse_room",
      varsInit: { gold: 100 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      syndicate_black: {
        id: "syndicate_black",
        name: "Black Syndicate",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
      },
    };

    // Active informant
    state.informants = {
      enforcer_bob: {
        id: "enforcer_bob",
        name: "Officer Bob",
        syndicateId: "syndicate_black",
        status: "active",
        timestamp: 1000,
      },
    };

    state.safehouses = {
      safehouse_room: {
        id: "safehouse_safehouse_room",
        roomId: "safehouse_room",
        ownerId: "player",
        syndicateId: "syndicate_black",
        level: 1,
        stashCapacity: 10,
        stashItems: ["contraband_item"],
        timestamp: 1000,
      },
    };

    // Run a step to trigger tickEnforcers -> tickInformants
    const stepRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: { type: "LOOK" },
      },
      mockPack
    );

    expect(stepRes.ok).toBe(true);
    
    // An upcoming raid warning should be scheduled
    const warnings = Object.values(stepRes.state.raidWarnings ?? {});
    expect(warnings.length).toBeGreaterThanOrEqual(1);
    expect(warnings[0].roomId).toBe("safehouse_room");
    expect(warnings[0].active).toBe(true);
    expect(stepRes.state.journal.some(j => j.includes("leaked enforcer raid plans"))).toBe(true);
  });

  it("should successfully trigger safehouse evacuation when pre-emptive warnings are active", () => {
    let state = createInitialState({
      seed: 42,
      start: "safehouse_room",
      varsInit: { gold: 100 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      syndicate_black: {
        id: "syndicate_black",
        name: "Black Syndicate",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
      },
    };

    state.safehouses = {
      safehouse_room: {
        id: "safehouse_safehouse_room",
        roomId: "safehouse_room",
        ownerId: "player",
        syndicateId: "syndicate_black",
        level: 1,
        stashCapacity: 10,
        stashItems: ["very_valuable_smuggled_diamond"],
        timestamp: 1000,
      },
    };

    // Add an active raid warning scheduled for the current step (step 0)
    state.raidWarnings = {
      warning_1: {
        roomId: "safehouse_room",
        syndicateId: "syndicate_black",
        scheduledStep: 1, // Will trigger on step 1
        active: true,
        timestamp: 1000,
      },
    };

    // Undercover agent ready to trigger a raid on step 1 (intel reaches 100)
    state.undercoverAgents = {
      spy_agent: {
        id: "spy_agent",
        syndicateId: "syndicate_black",
        name: "Agent Mulder",
        intelAccumulated: 90, // starts at 90, +10 in tick = 100
        status: "active",
        timestamp: 1000,
      },
    };

    // Perform look step which ticks undercover agents and triggers safehouse raid
    const stepRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: { type: "LOOK" },
      },
      mockPack
    );

    expect(stepRes.ok).toBe(true);

    // Verify safehouse stashItems were PRESERVED due to evacuation!
    const safehouse = stepRes.state.safehouses?.["safehouse_room"];
    expect(safehouse?.stashItems).toContain("very_valuable_smuggled_diamond");
    expect(stepRes.state.journal).toContain(
      "[Syndicate] Pre-emptive raid warning was active! Safehouse in room safehouse_room was successfully evacuated before the raid. No items were confiscated!"
    );
  });

  it("should successfully trigger production lab evacuation when pre-emptive warnings are active", () => {
    let seed = 12;
    for (let s = 1; s <= 200; s++) {
      const nextSeed = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(nextSeed ^ (nextSeed >>> 15), nextSeed | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      const intVal = Math.floor(value * 100) + 1;
      if (intVal <= 20) {
        seed = s;
        break;
      }
    }

    let state = createInitialState({
      seed,
      start: "front_room",
      varsInit: { gold: 100 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      syndicate_black: {
        id: "syndicate_black",
        name: "Black Syndicate",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
      },
    };

    state.productionLabs = {
      front_room: {
        id: "lab_front_room",
        ownerId: "player",
        roomId: "front_room",
        syndicateId: "syndicate_black",
        level: 1,
        capacity: 100,
        storedContraband: 45,
        cooldownSteps: 1,
        lastProducedStep: -1,
        defense: 10,
        timestamp: 1000,
      },
    };

    // Add active raid warning scheduled for current step (step 0 + 1)
    state.raidWarnings = {
      warning_1: {
        roomId: "front_room",
        syndicateId: "syndicate_black",
        scheduledStep: 0,
        active: true,
        timestamp: 1000,
      },
    };

    // Trigger lab tick which rolls a raid
    const tickedState = tickProductionLabs(state, [], mockPack);

    // Stored contraband should remain intact (not wiped to 0)
    const lab = tickedState.productionLabs?.["front_room"];
    expect(lab?.storedContraband).toBe(46); // 45 + 1 produced = 46 preserved!
    expect(tickedState.journal).toContain(
      "[Syndicate] Lab in front_room was pre-emptively evacuated due to active raid warning. Stored contraband of 46 was saved."
    );
  });

  it("should merge informant and raidWarning states across the P2P gossip mesh", () => {
    const stateA = createInitialState({ seed: 42, start: "safehouse_room" });
    const stateB = createInitialState({ seed: 42, start: "safehouse_room" });

    // Node A has an active informant
    stateA.informants = {
      enforcer_bob: {
        id: "enforcer_bob",
        name: "Officer Bob",
        syndicateId: "syndicate_black",
        status: "active",
        timestamp: 100,
      },
    };

    // Node B has a newer warning
    stateB.raidWarnings = {
      warning_1: {
        roomId: "safehouse_room",
        syndicateId: "syndicate_black",
        scheduledStep: 10,
        active: true,
        timestamp: 200,
      },
    };

    // Merge A into B
    const mergedB = mergeMonotonicStateFields(stateB, stateA);

    expect(mergedB.informants?.["enforcer_bob"]).toBeDefined();
    expect(mergedB.raidWarnings?.["warning_1"]).toBeDefined();

    // Now update B's informant to compromised with a newer timestamp
    const stateB2 = { ...stateB };
    stateB2.informants = {
      enforcer_bob: {
        id: "enforcer_bob",
        name: "Officer Bob",
        syndicateId: "syndicate_black",
        status: "compromised",
        timestamp: 300,
      },
    };

    // Merge B's updated state into A
    const mergedA = mergeMonotonicStateFields(stateA, stateB2);
    expect(mergedA.informants?.["enforcer_bob"]?.status).toBe("compromised");
  });
});
