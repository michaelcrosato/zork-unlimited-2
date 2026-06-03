import { describe, it, expect } from "vitest";
import { createInitialState, reconcileSyndicateTaxes } from "../src/core/state.js";
import { tickEconomy } from "../src/core/economy.js";
import { GossipNode } from "../src/core/gossip.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";

describe("Crime Syndicate Turf Tax & Automatic Collections (AF-53)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "syndicate_turf_tax_pack",
      title: "Syndicate Turf Tax Pack",
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
        npcs: ["merchant_timmy"],
        exits: [],
      },
    ],
    objects: [],
    npcs: [
      {
        id: "merchant_timmy",
        name: "Timmy the Merchant",
        description: "A friendly local merchant.",
        hp: 30,
        max_hp: 30,
        attack: 1,
        defense: 1,
        gold: 100,
        xp: 15,
        dialogue: {
          root: "root_node",
          nodes: [
            {
              id: "root_node",
              npc_text: "Welcome!",
              choices: [],
            },
          ],
        },
      },
    ],
  });

  it("should support ADJUST_TURF_TAX vote action and consensus arbitration", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
      varsInit: { gold: 1000 },
      agentsInit: ["agent_a", "agent_b", "agent_c"],
    });

    state.syndicates = {
      syndicate_red: {
        id: "syndicate_red",
        name: "Red Syndicate",
        members: ["agent_a", "agent_b", "agent_c"],
        definedBy: "agent_a",
        timestamp: 1000,
        turfTaxRate: 5,
      },
    };

    // 1. Rejected if non-member votes
    const nonMemberRes = multiAgentStep(
      state,
      {
        agentId: "agent_d",
        action: {
          type: "ADJUST_TURF_TAX",
          syndicateId: "syndicate_red",
          rate: 10,
          timestamp: 1001,
        } as any,
      },
      mockPack
    );
    expect(nonMemberRes.ok).toBe(false);
    expect(nonMemberRes.rejectionReason).toContain("cannot vote");

    // 2. Member votes to adjust tax rate to 15
    const vote1Res = multiAgentStep(
      state,
      {
        agentId: "agent_a",
        action: {
          type: "ADJUST_TURF_TAX",
          syndicateId: "syndicate_red",
          rate: 15,
          timestamp: 1002,
        } as any,
      },
      mockPack
    );
    expect(vote1Res.ok).toBe(true);
    expect(vote1Res.state.syndicateTaxVotes?.["syndicate_red"]?.["agent_a"]?.rate).toBe(15);
    // Consensus rate becomes 15 because it's the only vote
    expect(vote1Res.state.syndicates?.["syndicate_red"]?.turfTaxRate).toBe(15);

    // 3. Second member votes for 10
    const vote2Res = multiAgentStep(
      vote1Res.state,
      {
        agentId: "agent_b",
        action: {
          type: "ADJUST_TURF_TAX",
          syndicateId: "syndicate_red",
          rate: 10,
          timestamp: 1003,
        } as any,
      },
      mockPack
    );
    expect(vote2Res.ok).toBe(true);
    // There is a tie (1 vote for 15, 1 vote for 10). Arbitration rule sorts descending, preferring the higher rate: 15!
    expect(vote2Res.state.syndicates?.["syndicate_red"]?.turfTaxRate).toBe(15);

    // 4. Third member votes for 10
    const vote3Res = multiAgentStep(
      vote2Res.state,
      {
        agentId: "agent_c",
        action: {
          type: "ADJUST_TURF_TAX",
          syndicateId: "syndicate_red",
          rate: 10,
          timestamp: 1004,
        } as any,
      },
      mockPack
    );
    expect(vote3Res.ok).toBe(true);
    // Majority (2 votes for 10, 1 vote for 15) consensus: 10!
    expect(vote3Res.state.syndicates?.["syndicate_red"]?.turfTaxRate).toBe(10);
  });

  it("should generate passive turf taxes inside tickEconomy scaling by local turf guard presence", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
      varsInit: { gold: 0, gold_agent_a: 0 },
      agentsInit: ["agent_a"],
    });

    // Setup syndicate controlling market square turf
    state.syndicates = {
      shadow_crew: {
        id: "shadow_crew",
        name: "Shadow Crew",
        members: ["agent_a"],
        definedBy: "agent_a",
        timestamp: 1000,
        turfTaxRate: 8,
      },
    };
    state.syndicateTurf = {
      market: "shadow_crew",
    };

    // Register a front business in the room
    state.frontBusinesses = {
      merchant_timmy: {
        id: "front_timmy",
        merchantId: "merchant_timmy",
        roomId: "market",
        syndicateId: "shadow_crew",
        level: 1,
        dirtyGold: 0,
        cleanGold: 50, // Has 50 clean gold
        launderingCapacity: 100,
        launderingRate: 20,
        timestamp: 1000,
      },
    };

    // No guards: Base tax = 8 * (1 + 0) = 8
    state.step = 5; // economy ticks every 5 steps
    let econState = tickEconomy(state, mockPack);
    expect(econState.frontBusinesses?.["merchant_timmy"]?.cleanGold).toBe(42); // 50 - 8
    expect(econState.vars["gold_agent_a"]).toBe(8); // distributed to agent_a
    expect(econState.vars["totalTurfTaxesCollected"]).toBe(8);

    // With 2 guards: Tax = 8 * (1 + 2) = 24
    state.turfGuards = {
      market: {
        roomId: "market",
        syndicateId: "shadow_crew",
        count: 2,
        cost: 200,
        timestamp: 1001,
      },
    };
    state.step = 5;
    econState = tickEconomy(state, mockPack);
    expect(econState.frontBusinesses?.["merchant_timmy"]?.cleanGold).toBe(26); // 50 - 24
    expect(econState.vars["gold_agent_a"]).toBe(24);
    expect(econState.vars["totalTurfTaxesCollected"]).toBe(24);
    expect(econState.journal.some(line => line.includes("collected 24 gold in turf taxes"))).toBe(true);
  });

  it("should reconcile syndicate tax votes across the P2P mesh during gossip node convergence", () => {
    const nodeA = new GossipNode("node_a", mockPack, 12345);
    const nodeB = new GossipNode("node_b", mockPack, 12345);

    // Connect nodes
    nodeA.connect(nodeB);

    // node_a creates the syndicate via action so it is in the transaction journal!
    const createStep = nodeA.executeLocalAction({
      type: "CREATE_SYNDICATE",
      id: "sync_syndicate",
      name: "Sync Syndicate",
      members: ["node_a", "node_b"],
      timestamp: 1000,
    } as any);
    expect(createStep.ok).toBe(true);

    // node_b needs to have the syndicate too! Let's sync node_a's creation to node_b first so node_b knows the syndicate exists!
    nodeA.gossip();
    expect(nodeB.localState.syndicates?.["sync_syndicate"]).toBeDefined();

    // node_a votes for 20
    const stepA = nodeA.executeLocalAction({
      type: "ADJUST_TURF_TAX",
      syndicateId: "sync_syndicate",
      rate: 20,
      timestamp: 1010,
    } as any);
    expect(stepA.ok).toBe(true);
    expect(nodeA.localState.syndicates?.["sync_syndicate"]?.turfTaxRate).toBe(20);

    // node_b votes for 10
    const stepB = nodeB.executeLocalAction({
      type: "ADJUST_TURF_TAX",
      syndicateId: "sync_syndicate",
      rate: 10,
      timestamp: 1011,
    } as any);
    expect(stepB.ok).toBe(true);
    expect(nodeB.localState.syndicates?.["sync_syndicate"]?.turfTaxRate).toBe(10);

    // Reconcile via Gossip in both directions
    nodeB.gossip(); // node_b sends its vote to node_a. Node A converges!
    nodeA.gossip(); // node_a sends all to node_b. Node B converges!

    // Both should now converge on consensus tax rate: 20 (tie-breaking, 20 > 10)
    expect(nodeA.localState.syndicates?.["sync_syndicate"]?.turfTaxRate).toBe(20);
    expect(nodeB.localState.syndicates?.["sync_syndicate"]?.turfTaxRate).toBe(20);
  });
});
