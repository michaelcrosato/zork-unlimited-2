import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";
import { step } from "../src/core/engine.js";

describe("Crime Syndicate Counter-Intelligence Operations & Undercover Enforcer Infiltration (AF-62)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "counter_intel_pack",
      title: "Counter-Intelligence Pack",
      start_room: "safehouse_room",
      vars_init: { gold: 1000, hp: 20, max_hp: 20 },
      flags_init: [],
    },
    factions: [],
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

  it("should handle periodic undercover enforcer infiltration and safehouse raids on intel completion", () => {
    let state = createInitialState({
      seed: 42,
      start: "safehouse_room",
      varsInit: { gold: 1000, gold_agent_a: 100 },
      agentsInit: ["agent_a"],
    });

    // 1. Setup Syndicate, Front Business, and Safehouse
    state.syndicates = {
      syndicate_red: {
        id: "syndicate_red",
        name: "Red Syndicate",
        members: ["agent_a"],
        definedBy: "agent_a",
        timestamp: 1000,
        dominance: 80,
      },
    };

    state.safehouses = {
      safehouse_room: {
        id: "safehouse_safehouse_room",
        roomId: "safehouse_room",
        ownerId: "agent_a",
        syndicateId: "syndicate_red",
        level: 1,
        stashCapacity: 10,
        stashItems: ["contraband_item_1", "contraband_item_2"],
        timestamp: 1000,
      },
    };

    state.frontBusinesses = {
      front_business_1: {
        id: "front_business_1",
        merchantId: "merchant_dummy",
        roomId: "front_room",
        syndicateId: "syndicate_red",
        level: 1,
        dirtyGold: 50,
        cleanGold: 50,
        launderingCapacity: 100,
        launderingRate: 10,
        timestamp: 1000,
      },
    };

    // Spike enforcer heat in front business room to guarantee high infiltration chance
    state.enforcementHeat = {
      front_room: {
        roomId: "front_room",
        heat: 250,
        timestamp: 1000,
      },
    };

    // 2. Perform a step (which increases state.step and runs tickEnforcers)
    // We run a dummy action just to trigger tickEnforcers
    const firstStepResult = multiAgentStep(
      state,
      {
        agentId: "agent_a",
        action: { type: "LOOK" },
      },
      mockPack
    );

    expect(firstStepResult.ok).toBe(true);
    let nextState = firstStepResult.state;

    // Verify undercover agent got spawned
    const agents = Object.values(nextState.undercoverAgents ?? {});
    expect(agents.length).toBe(1);
    const agent = agents[0];
    expect(agent.status).toBe("active");
    expect(agent.syndicateId).toBe("syndicate_red");
    expect(agent.intelAccumulated).toBe(35); // Starts at 35 (spawned and immediately ticked in the first step)

    // Verify that the syndicate struct undercoverAgents contains our new agent ID
    const syndicate = nextState.syndicates?.["syndicate_red"];
    expect(syndicate?.undercoverAgents).toContain(agent.id);

    // 3. Tick multiple steps to accumulate intel up to 100 and trigger a raid!
    // Since it increments by 10 + heatBonus (heat of front_room is 250, so heatBonus is 25, total 35 per step).
    // Let's run 2 more steps to reach >= 100 intel (35 + 35*2 = 105)
    for (let i = 0; i < 2; i++) {
      const stepRes = multiAgentStep(
        nextState,
        {
          agentId: "agent_a",
          action: { type: "LOOK" },
        },
        mockPack
      );
      expect(stepRes.ok).toBe(true);
      nextState = stepRes.state;
    }

    // After 5 steps, the undercover agent should have accumulated >= 100 intel and triggered the raid
    const updatedAgent = nextState.undercoverAgents?.[agent.id];
    expect(updatedAgent?.status).toBe("exposed");
    expect(updatedAgent?.intelAccumulated).toBe(100);

    // Verify safehouse got raided: stashItems should be cleared!
    const raidedSafehouse = nextState.safehouses?.["safehouse_room"];
    expect(raidedSafehouse?.stashItems.length).toBe(0);

    // Verify enforcer heat in safehouse room spiked to 100 (which decayed to 99 by the end of the step)
    expect(nextState.enforcementHeat?.["safehouse_room"]?.heat).toBe(99);

    // Verify syndicate dominance was reduced by 25 (from 80 to 55)
    expect(nextState.syndicates?.["syndicate_red"]?.dominance).toBe(55);
  });

  it("should support LAUNCH_BACKGROUND_CHECK and EXPOSE_MOLE action transitions", () => {
    let state = createInitialState({
      seed: 42,
      start: "safehouse_room",
      varsInit: { gold: 100, gold_agent_a: 500 },
      agentsInit: ["agent_a"],
    });

    state.syndicates = {
      syndicate_red: {
        id: "syndicate_red",
        name: "Red Syndicate",
        members: ["agent_a"],
        definedBy: "agent_a",
        timestamp: 1000,
        dominance: 80,
      },
    };

    // Add a pre-existing active undercover agent
    state.undercoverAgents = {
      undercover_agent_x: {
        id: "undercover_agent_x",
        syndicateId: "syndicate_red",
        name: "Agent Mulder",
        intelAccumulated: 40,
        status: "active",
        timestamp: 1000,
      },
    };

    // 1. Rejected if non-member launches background check
    const nonMemberCheck = multiAgentStep(
      state,
      {
        agentId: "agent_b", // Not registered or a member of syndicate_red
        action: {
          type: "LAUNCH_BACKGROUND_CHECK",
          syndicateId: "syndicate_red",
          targetAgentId: "undercover_agent_x",
          timestamp: 1001,
        } as any,
      },
      mockPack
    );
    expect(nonMemberCheck.ok).toBe(false);
    expect(nonMemberCheck.rejectionReason).toContain("is not a member of syndicate");

    // 2. Succeeded background check when agent is a member and pays 50 gold
    const checkRes = multiAgentStep(
      state,
      {
        agentId: "agent_a",
        action: {
          type: "LAUNCH_BACKGROUND_CHECK",
          syndicateId: "syndicate_red",
          targetAgentId: "Agent Mulder", // matching by name
          timestamp: 1001,
        } as any,
      },
      mockPack
    );

    expect(checkRes.ok).toBe(true);
    // Gold deducted: 500 - 50 = 450
    expect(checkRes.state.vars["gold_agent_a"]).toBe(450);
    // Undercover agent Mulder should now be exposed
    expect(checkRes.state.undercoverAgents?.["undercover_agent_x"]?.status).toBe("exposed");
    expect(checkRes.state.journal).toContain(
      "[Syndicate] Background check on Agent Mulder by agent agent_a succeeded! Identified as undercover agent Agent Mulder!"
    );

    // 3. EXPOSE_MOLE rejected if mole is not exposed yet
    let activeState = { ...state };
    const failExpose = multiAgentStep(
      activeState,
      {
        agentId: "agent_a",
        action: {
          type: "EXPOSE_MOLE",
          syndicateId: "syndicate_red",
          targetAgentId: "undercover_agent_x",
          timestamp: 1002,
        } as any,
      },
      mockPack
    );
    expect(failExpose.ok).toBe(false);
    expect(failExpose.rejectionReason).toContain("has not been exposed yet. Launch a background check first!");

    // 4. EXPOSE_MOLE succeeds if mole is exposed
    const successExpose = multiAgentStep(
      checkRes.state,
      {
        agentId: "agent_a",
        action: {
          type: "EXPOSE_MOLE",
          syndicateId: "syndicate_red",
          targetAgentId: "undercover_agent_x",
          timestamp: 1002,
        } as any,
      },
      mockPack
    );

    expect(successExpose.ok).toBe(true);
    expect(successExpose.state.undercoverAgents?.["undercover_agent_x"]?.status).toBe("rooted_out");
    expect(successExpose.state.journal).toContain(
      "[Syndicate] Exposed mole Agent Mulder has been rooted out of syndicate syndicate_red by agent agent_a!"
    );
  });

  it("should replicate undercover enforcer states across the gossip mesh using LWW rules", () => {
    const stateA = createInitialState({ seed: 42, start: "safehouse_room" });
    const stateB = createInitialState({ seed: 42, start: "safehouse_room" });

    // Populate undercover agents in A
    stateA.undercoverAgents = {
      agent_abc: {
        id: "agent_abc",
        syndicateId: "syndicate_omega",
        name: "Officer Jenkins",
        intelAccumulated: 20,
        status: "active",
        timestamp: 100,
      },
    };

    // B has no undercover agents initially
    expect(Object.keys(stateB.undercoverAgents ?? {}).length).toBe(0);

    // Merge A into B
    const mergedB = mergeMonotonicStateFields(stateB, stateA);

    // Verify Node B now has Node A's undercover agent
    expect(mergedB.undercoverAgents?.["agent_abc"]).toBeDefined();
    expect(mergedB.undercoverAgents?.["agent_abc"]?.name).toBe("Officer Jenkins");
    expect(mergedB.undercoverAgents?.["agent_abc"]?.intelAccumulated).toBe(20);

    // Now update B's version with a newer timestamp
    const stateB2 = { ...stateB };
    stateB2.undercoverAgents = {
      agent_abc: {
        id: "agent_abc",
        syndicateId: "syndicate_omega",
        name: "Officer Jenkins",
        intelAccumulated: 30,
        status: "exposed",
        timestamp: 200, // Newer timestamp
      },
    };

    // Merge B's updated state into A's state
    const mergedA = mergeMonotonicStateFields(stateA, stateB2);

    // A's state should have merged LWW to exposed with 30 intel
    expect(mergedA.undercoverAgents?.["agent_abc"]?.status).toBe("exposed");
    expect(mergedA.undercoverAgents?.["agent_abc"]?.intelAccumulated).toBe(30);
  });
});
