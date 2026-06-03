import { describe, it, expect } from "vitest";
import { createInitialState, reconcileSyndicateWaivers } from "../src/core/state.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { step } from "../src/core/engine.js";
import { multiAgentStep } from "../src/core/sync.js";
import { GossipNode } from "../src/core/gossip.js";
import { calculateTradePrice } from "../src/core/economy.js";

describe("Crime Syndicate Checkpoint Bribe Waivers & Reputation Gating (AF-55)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "syndicate_checkpoint_pack",
      title: "Syndicate Checkpoint Pack",
      start_room: "market",
      vars_init: { gold: 1000, hp: 20, max_hp: 20 },
      flags_init: [],
    },
    factions: [],
    rooms: [
      {
        id: "market",
        name: "Market Square",
        description: "A bustling village market.",
        objects: [],
        npcs: ["syndicate_trader"],
        exits: [
          {
            direction: "NORTH",
            to: "alley",
          },
        ],
      },
      {
        id: "alley",
        name: "Dark Alley",
        description: "A dark alleyway controlled by the syndicate.",
        objects: [],
        npcs: [],
        exits: [
          {
            direction: "SOUTH",
            to: "market",
          },
        ],
      },
    ],
    objects: [
      {
        id: "lockpick",
        name: "Lockpick",
        description: "A suspicious tool.",
        takeable: true,
        cost: 20,
      },
    ],
    npcs: [
      {
        id: "syndicate_trader",
        name: "Syndicate Trader",
        description: "A shady trader.",
        min_rep: 0,
        dialogue: {
          root: "root_node",
          nodes: [
            {
              id: "root_node",
              npc_text: "Hello friend!",
              choices: [],
            },
          ],
        },
      },
    ],
  });

  it("should support ADJUST_TURF_WAIVER vote action and consensus arbitration", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
      varsInit: { gold: 1000 },
      agentsInit: ["agent_a", "agent_b", "agent_c"],
    });

    state.syndicates = {
      syndicate_black: {
        id: "syndicate_black",
        name: "Black Syndicate",
        members: ["agent_a", "agent_b", "agent_c"],
        definedBy: "agent_a",
        timestamp: 1000,
        turfTaxRate: 5,
        turfBribeCost: 10,
        turfWaiverThreshold: 50,
      },
    };

    // 1. Rejected if non-member votes
    const nonMemberRes = multiAgentStep(
      state,
      {
        agentId: "agent_d",
        action: {
          type: "ADJUST_TURF_WAIVER",
          syndicateId: "syndicate_black",
          threshold: 25,
          timestamp: 1001,
        } as any,
      },
      mockPack
    );
    expect(nonMemberRes.ok).toBe(false);
    expect(nonMemberRes.rejectionReason).toContain("cannot vote");

    // 2. Member votes to adjust waiver threshold to 30
    const vote1Res = multiAgentStep(
      state,
      {
        agentId: "agent_a",
        action: {
          type: "ADJUST_TURF_WAIVER",
          syndicateId: "syndicate_black",
          threshold: 30,
          timestamp: 1002,
        } as any,
      },
      mockPack
    );
    expect(vote1Res.ok).toBe(true);
    expect(vote1Res.state.syndicateWaiverVotes?.["syndicate_black"]?.["agent_a"]?.threshold).toBe(30);
    expect(vote1Res.state.syndicates?.["syndicate_black"]?.turfWaiverThreshold).toBe(30);

    // 3. Second member votes for 60 (tie-breaking, prefers higher threshold 60)
    const vote2Res = multiAgentStep(
      vote1Res.state,
      {
        agentId: "agent_b",
        action: {
          type: "ADJUST_TURF_WAIVER",
          syndicateId: "syndicate_black",
          threshold: 60,
          timestamp: 1003,
        } as any,
      },
      mockPack
    );
    expect(vote2Res.ok).toBe(true);
    expect(vote2Res.state.syndicates?.["syndicate_black"]?.turfWaiverThreshold).toBe(60);

    // 4. Third member votes for 30 (majority 30 over 60)
    const vote3Res = multiAgentStep(
      vote2Res.state,
      {
        agentId: "agent_c",
        action: {
          type: "ADJUST_TURF_WAIVER",
          syndicateId: "syndicate_black",
          threshold: 30,
          timestamp: 1004,
        } as any,
      },
      mockPack
    );
    expect(vote3Res.ok).toBe(true);
    expect(vote3Res.state.syndicates?.["syndicate_black"]?.turfWaiverThreshold).toBe(30);
  });

  it("should wire reputation gating at checkpoints carrying contraband", () => {
    // Helper to generate base test state
    const getBaseState = () => {
      let state = createInitialState({
        seed: 42,
        start: "market",
        varsInit: { gold: 100 },
        flagsInit: [],
      });

      // Make lockpick contraband
      state.contrabandBlacklist = {
        lockpick: {
          blacklisted: true,
          timestamp: 1000,
        },
      };

      state.syndicates = {
        syndicate_black: {
          id: "syndicate_black",
          name: "Black Syndicate",
          members: ["agent_a"],
          definedBy: "agent_a",
          timestamp: 1000,
          turfTaxRate: 5,
          turfBribeCost: 20,
          turfWaiverThreshold: 40,
        },
      };

      state.syndicateTurf = {
        alley: "syndicate_black",
      };
      state.turfCheckpoints = {
        alley: {
          roomId: "alley",
          syndicateId: "syndicate_black",
          active: true,
          timestamp: 1001,
        },
      };

      state.inventory = ["lockpick"];
      return state;
    };

    // Case 1: High reputation (>= waiver threshold) completely waives the bribe toll
    let stateWaived = getBaseState();
    stateWaived.factionRep = { syndicate_black: 40 };

    const waivedRes = step(stateWaived, { type: "MOVE", direction: "NORTH" }, mockPack);
    expect(waivedRes.ok).toBe(true);
    expect(waivedRes.state.current).toBe("alley");
    expect(waivedRes.state.vars["gold"]).toBe(85); // 100 - 15 extortion toll
    expect(
      waivedRes.events.some(
        (e) => e.type === "narration" && e.text.includes("waives the contraband checkpoint bribe toll")
      )
    ).toBe(true);

    // Case 2: Disliked enemy (< 0 rep) pays double bribe fee
    let stateDisliked = getBaseState();
    stateDisliked.factionRep = { syndicate_black: -20 };

    const dislikedRes = step(stateDisliked, { type: "MOVE", direction: "NORTH" }, mockPack);
    expect(dislikedRes.ok).toBe(true);
    expect(dislikedRes.state.current).toBe("alley");
    expect(dislikedRes.state.vars["gold"]).toBe(45); // 100 - 40 (double bribe toll) - 15 extortion toll
    expect(dislikedRes.events.some((e) => e.type === "narration" && e.text.includes("Paid 40 gold"))).toBe(true);

    // Case 3: Hated enemy (<= -50 rep) triggers pre-emptive ambush immediately
    let stateHated = getBaseState();
    stateHated.factionRep = { syndicate_black: -50 };

    const hatedRes = step(stateHated, { type: "MOVE", direction: "NORTH" }, mockPack);
    expect(hatedRes.ok).toBe(true);
    expect(hatedRes.state.current).toBe("alley");
    expect(hatedRes.state.vars["gold"]).toBe(85); // 100 - 15 extortion toll. No bribe option given.
    expect(hatedRes.state.flags["in_combat_with_turf_enforcer_syndicate_black"]).toBe(true);
    expect(hatedRes.events.some((e) => e.type === "narration" && e.text.includes("Pre-emptive Ambush"))).toBe(true);

    // Dynamic enforcer HP/defense scaling check
    const enforcer = hatedRes.state.enforcers?.["turf_enforcer_syndicate_black"];
    expect(enforcer).toBeDefined();
    // repPenalty = 50. Scaled HP = 30 + 50 = 80. Scaled Defense = 12 + 10 = 22.
    expect(enforcer?.hp).toBe(80);
    expect(enforcer?.defense).toBe(22);
    expect(hatedRes.state.vars["npc_hp_turf_enforcer_syndicate_black"]).toBe(80);
  });

  it("should reconcile checkpoints and waiver votes across the Gossip P2P mesh", () => {
    const nodeA = new GossipNode("node_a", mockPack, 12345);
    const nodeB = new GossipNode("node_b", mockPack, 12345);

    nodeA.connect(nodeB);

    // node_a creates syndicate black
    nodeA.executeLocalAction({
      type: "CREATE_SYNDICATE",
      id: "sync_syndicate_black",
      name: "Sync Black Syndicate",
      members: ["node_a", "node_b"],
      timestamp: 1000,
    } as any);

    // Sync to node_b
    nodeA.gossip();
    expect(nodeB.localState.syndicates?.["sync_syndicate_black"]).toBeDefined();

    // node_a votes for 30 waiver threshold
    nodeA.executeLocalAction({
      type: "ADJUST_TURF_WAIVER",
      syndicateId: "sync_syndicate_black",
      threshold: 30,
      timestamp: 1020,
    } as any);

    // node_b votes for 60 waiver threshold
    nodeB.executeLocalAction({
      type: "ADJUST_TURF_WAIVER",
      syndicateId: "sync_syndicate_black",
      threshold: 60,
      timestamp: 1021,
    } as any);

    // Sync gossip mesh
    nodeB.gossip();
    nodeA.gossip();

    // Verify consensus waiver threshold converges to 60 (descending order preferences on tie-break)
    expect(nodeA.localState.syndicates?.["sync_syndicate_black"]?.turfWaiverThreshold).toBe(60);
    expect(nodeB.localState.syndicates?.["sync_syndicate_black"]?.turfWaiverThreshold).toBe(60);
  });

  it("should apply strategic Crime Syndicate reputation price multipliers", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
      varsInit: {},
      flagsInit: [],
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

    state.syndicateTurf = {
      market: "syndicate_black",
    };

    const npc = { id: "syndicate_trader", faction: "syndicate_black" };
    const item = { id: "lockpick" };

    // Case 1: High reputation gives a buy discount and sell bonus
    state.factionRep = { syndicate_black: 20 };
    const buyPriceHigh = calculateTradePrice(state, npc, item, 100, true, "player", mockPack);
    const sellPriceHigh = calculateTradePrice(state, npc, item, 100, false, "player", mockPack);
    // buyPriceHigh: multiplier buy factor = 1.0 - 20 * 0.02 = 0.6. Price = 100 * 0.6 = 60
    // sellPriceHigh: multiplier sell factor = 1.0 + 20 * 0.02 = 1.4. Price = 100 * 1.4 = 140
    expect(buyPriceHigh).toBe(60);
    expect(sellPriceHigh).toBe(140);

    // Case 2: Negative reputation gives a buy penalty and sell penalty
    state.factionRep = { syndicate_black: -20 };
    const buyPriceLow = calculateTradePrice(state, npc, item, 100, true, "player", mockPack);
    const sellPriceLow = calculateTradePrice(state, npc, item, 100, false, "player", mockPack);
    // buyPriceLow: multiplier buy factor = 1.0 - (-20) * 0.02 = 1.4. Price = 100 * 1.4 = 140
    // sellPriceLow: multiplier sell factor = 1.0 + (-20) * 0.02 = 0.6. Price = 100 * 0.6 = 60
    expect(buyPriceLow).toBe(140);
    expect(sellPriceLow).toBe(60);
  });
});
