import { describe, it, expect } from "vitest";
import { createInitialState, getFactionRepInit, reconcileAlliances } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { GossipNode } from "../src/core/gossip.js";
import { ParserPack } from "../src/parser/schema.js";
import { computeStateHash } from "../src/core/hash.js";
import { multiAgentStep } from "../src/core/sync.js";

describe("Dynamic Decentralized Faction Alliances & Vote Arbitration", () => {
  const mockPack: ParserPack = {
    meta: {
      id: "alliance_test_pack",
      title: "Alliance Test Adventure",
      start_room: "clearing",
      vars_init: {},
      flags_init: [],
    },
    factions: [
      {
        id: "rangers",
        name: "Forest Rangers",
        description: "Protectors of the green woods.",
        initial_rep: 10,
      },
      {
        id: "shadow_guild",
        name: "Shadow Guild",
        description: "Secret syndicate.",
        initial_rep: -5,
      },
      {
        id: "merchant_union",
        name: "Merchant Union",
        description: "Guild of traders.",
        initial_rep: 15,
      },
    ],
    rooms: [
      {
        id: "clearing",
        name: "Sunlit Clearing",
        description: "A lovely open space.",
        objects: [],
        npcs: [],
        exits: [
          {
            direction: "north",
            to: "ranger_outpost",
            conditions: [],
          },
        ],
      },
      {
        id: "ranger_outpost",
        name: "Ranger Outpost",
        description: "A fortified shelter.",
        objects: [],
        npcs: [],
        faction: "rangers",
        exits: [],
      },
    ],
    objects: [],
    npcs: [],
    win_conditions: [],
    endings: [],
  };

  it("should initialize alliance state and handle PROPOSE_ALLIANCE and DISSOLVE_ALLIANCE decentralized actions", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
      factionRepInit: { rangers: 10, merchant_union: 15 },
    });

    expect(state.alliances).toEqual({});
    expect(state.allianceVotes).toEqual({});

    // 1. Propose alliance with invalid faction
    const resFail1 = multiAgentStep(state, {
      agentId: "alice",
      action: {
        type: "PROPOSE_ALLIANCE",
        factionA: "unknown_faction",
        factionB: "rangers",
        timestamp: 100,
      } as any,
    }, mockPack);
    expect(resFail1.ok).toBe(false);
    expect(resFail1.rejectionReason).toContain("is not a valid faction");

    // 2. Propose alliance with same faction
    const resFail2 = multiAgentStep(state, {
      agentId: "alice",
      action: {
        type: "PROPOSE_ALLIANCE",
        factionA: "rangers",
        factionB: "rangers",
        timestamp: 100,
      } as any,
    }, mockPack);
    expect(resFail2.ok).toBe(false);
    expect(resFail2.rejectionReason).toContain("Cannot form alliance with the same faction");

    // 3. Valid PROPOSE_ALLIANCE action
    const resA = multiAgentStep(state, {
      agentId: "alice",
      action: {
        type: "PROPOSE_ALLIANCE",
        factionA: "rangers",
        factionB: "merchant_union",
        timestamp: 100,
      } as any,
    }, mockPack);
    expect(resA.ok).toBe(true);
    expect(resA.state.allianceVotes?.["merchant_union:rangers"]?.alice).toEqual({
      targetState: "allied",
      timestamp: 100,
    });
    expect(resA.state.alliances?.["rangers"]?.[ "merchant_union"]).toBe("allied");
    expect(resA.state.alliances?.["merchant_union"]?.[ "rangers"]).toBe("allied");

    // 4. Older vote should be ignored
    const resA2 = multiAgentStep(resA.state, {
      agentId: "alice",
      action: {
        type: "PROPOSE_ALLIANCE",
        factionA: "rangers",
        factionB: "merchant_union",
        targetState: "hostile",
        timestamp: 50, // older
      } as any,
    }, mockPack);
    expect(resA2.ok).toBe(true);
    expect(resA2.state.allianceVotes?.["merchant_union:rangers"]?.alice?.targetState).toBe("allied");

    // 5. Newer vote should overwrite
    const resA3 = multiAgentStep(resA.state, {
      agentId: "alice",
      action: {
        type: "DISSOLVE_ALLIANCE",
        factionA: "rangers",
        factionB: "merchant_union",
        timestamp: 200, // newer
      } as any,
    }, mockPack);
    expect(resA3.ok).toBe(true);
    expect(resA3.state.allianceVotes?.["merchant_union:rangers"]?.alice?.targetState).toBe("neutral");
    expect(resA3.state.alliances?.["rangers"]?.[ "merchant_union"]).toBe("neutral");
  });

  it("should arbitrate consensus with deterministic tie-breaking rules", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
      factionRepInit: { rangers: 10, merchant_union: 15 },
    });

    // Majority vote: 2 votes for allied, 1 for hostile
    state.allianceVotes = {
      "merchant_union:rangers": {
        alice: { targetState: "allied", timestamp: 100 },
        bob: { targetState: "allied", timestamp: 100 },
        charlie: { targetState: "hostile", timestamp: 100 },
      },
    };
    let reconciled = reconcileAlliances(state, mockPack);
    expect(reconciled.alliances?.["rangers"]?.["merchant_union"]).toBe("allied");

    // Tie-break priority: allied > hostile > neutral
    state.allianceVotes = {
      "merchant_union:rangers": {
        alice: { targetState: "neutral", timestamp: 100 },
        bob: { targetState: "hostile", timestamp: 100 },
      },
    };
    let reconciledTie1 = reconcileAlliances(state, mockPack);
    expect(reconciledTie1.alliances?.["rangers"]?.["merchant_union"]).toBe("hostile");

    state.allianceVotes = {
      "merchant_union:rangers": {
        alice: { targetState: "neutral", timestamp: 100 },
        bob: { targetState: "allied", timestamp: 100 },
      },
    };
    let reconciledTie2 = reconcileAlliances(state, mockPack);
    expect(reconciledTie2.alliances?.["rangers"]?.["merchant_union"]).toBe("allied");
  });

  it("should synchronize alliance votes and converge perfectly across a P2P gossip mesh", () => {
    const nodeA = new GossipNode("alice", mockPack, 42);
    const nodeB = new GossipNode("bob", mockPack, 42);
    nodeA.connect(nodeB);

    // Alice votes PROPOSE_ALLIANCE
    nodeA.executeLocalAction({
      type: "PROPOSE_ALLIANCE",
      factionA: "rangers",
      factionB: "merchant_union",
      timestamp: 100,
    } as any);

    // Bob votes DISSOLVE_ALLIANCE
    nodeB.executeLocalAction({
      type: "DISSOLVE_ALLIANCE",
      factionA: "rangers",
      factionB: "merchant_union",
      timestamp: 200,
    } as any);

    // Synchronize gossip
    nodeA.gossip();
    nodeB.gossip();
    nodeA.gossip(); // full convergence

    // Both should contain both votes
    expect(nodeA.localState.allianceVotes?.["merchant_union:rangers"]?.alice?.targetState).toBe("allied");
    expect(nodeA.localState.allianceVotes?.["merchant_union:rangers"]?.bob?.targetState).toBe("neutral");

    expect(nodeB.localState.allianceVotes?.["merchant_union:rangers"]?.alice?.targetState).toBe("allied");
    expect(nodeB.localState.allianceVotes?.["merchant_union:rangers"]?.bob?.targetState).toBe("neutral");

    // Reconciled consensus: frequency tie (1 allied vs 1 neutral).
    // Tie-breaker priority allied > neutral. Consensual state = allied.
    expect(nodeA.localState.alliances?.["rangers"]?.["merchant_union"]).toBe("allied");
    expect(nodeB.localState.alliances?.["rangers"]?.["merchant_union"]).toBe("allied");

    expect(computeStateHash(nodeA.localState)).toBe(computeStateHash(nodeB.localState));
  });

  it("should dynamically scale travel taxes based on faction alliance relationships", () => {
    // Faction rangers controls ranger_outpost.
    // Base player rep with rangers is 0 (neutral) => travel tax = 2.
    // The player is allied with merchant_union (rep >= 10).
    
    // Case 1: Neutral / No Alliance
    let state = createInitialState({
      seed: 42,
      start: "clearing",
      varsInit: { gold: 10 },
      factionRepInit: { rangers: 0, merchant_union: 12 },
      territoryControlInit: { ranger_outpost: "rangers" },
    });

    let resNeutral = step(state, { type: "MOVE", direction: "north" }, mockPack);
    expect(resNeutral.ok).toBe(true);
    expect(resNeutral.state.vars["gold"]).toBe(8); // paid normal 2 gold tax

    // Case 2: Allied Factions Relationship => no travel tax!
    let stateAllied = createInitialState({
      seed: 42,
      start: "clearing",
      varsInit: { gold: 10 },
      factionRepInit: { rangers: 0, merchant_union: 12 },
      territoryControlInit: { ranger_outpost: "rangers" },
    });
    // Add vote so rangers is allied with merchant_union
    stateAllied.allianceVotes = {
      "merchant_union:rangers": {
        alice: { targetState: "allied", timestamp: 100 },
      },
    };
    stateAllied = reconcileAlliances(stateAllied, mockPack);

    let resAllied = step(stateAllied, { type: "MOVE", direction: "north" }, mockPack);
    expect(resAllied.ok).toBe(true);
    expect(resAllied.state.vars["gold"]).toBe(10); // paid 0 travel tax!

    // Case 3: Hostile Factions Relationship => double travel tax!
    let stateHostile = createInitialState({
      seed: 42,
      start: "clearing",
      varsInit: { gold: 10 },
      factionRepInit: { rangers: 0, merchant_union: 12 },
      territoryControlInit: { ranger_outpost: "rangers" },
    });
    // Add vote so rangers is hostile to merchant_union
    stateHostile.allianceVotes = {
      "merchant_union:rangers": {
        alice: { targetState: "hostile", timestamp: 100 },
      },
    };
    stateHostile = reconcileAlliances(stateHostile, mockPack);

    let resHostile = step(stateHostile, { type: "MOVE", direction: "north" }, mockPack);
    expect(resHostile.ok).toBe(true);
    expect(resHostile.state.vars["gold"]).toBe(6); // paid 4 gold tax (2 * 2)!
  });
});
