import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { GossipNode } from "../src/core/gossip.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";
import { tickEconomy } from "../src/core/economy.js";
import { computeStateHash } from "../src/core/hash.js";

describe("Crime Syndicate Extortion and Protection Rackets (AF-45)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "syndicate_extortion_pack",
      title: "Syndicate Extortion Test Pack",
      start_room: "market",
      start: "market",
      vars_init: { gold: 100, gold_alice: 100, gold_bob: 100 },
      flags_init: [],
    },
    factions: [],
    rooms: [
      {
        id: "market",
        name: "Grand Market",
        description: "A bustling market square.",
        objects: [],
        npcs: ["merchant_npc"],
        exits: [
          {
            direction: "NORTH",
            to: "secret_passage",
          },
        ],
      },
      {
        id: "secret_passage",
        name: "Secret Passage",
        description: "A narrow alley controlled by the underground.",
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
    objects: [],
    npcs: [
      {
        id: "merchant_npc",
        name: "Honest Bob",
        description: "A simple merchant trying to get by.",
        gold: 150,
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

  it("should support demanding protection and collecting initial extortion gold", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 100, gold_alice: 100 },
      agentsInit: ["player", "alice"],
    });

    // 1. Setup Syndicate
    const createRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "CREATE_SYNDICATE",
          id: "shadow_cartel",
          name: "Shadow Cartel",
          members: ["player", "alice"],
          timestamp: 1000,
        } as any,
      },
      mockPack
    );
    expect(createRes.ok).toBe(true);
    state = createRes.state;

    // 2. Reject demanding protection if merchant is not in the room
    const badLocRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "DEMAND_PROTECTION",
          merchantId: "merchant_npc",
          syndicateId: "shadow_cartel",
          timestamp: 1005,
        } as any,
      },
      {
        ...mockPack,
        rooms: [
          { ...mockPack.rooms[0], npcs: [] }, // Merchant NPC is removed from current room
          mockPack.rooms[1],
        ],
      }
    );
    expect(badLocRes.ok).toBe(false);
    expect(badLocRes.rejectionReason).toContain("not in room");

    // 3. Demand protection successfully
    const demandRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "DEMAND_PROTECTION",
          merchantId: "merchant_npc",
          syndicateId: "shadow_cartel",
          timestamp: 1010,
        } as any,
      },
      mockPack
    );

    expect(demandRes.ok).toBe(true);
    state = demandRes.state;

    // Check that racket contract was registered
    const racket = state.protectionRackets?.["merchant_npc"];
    expect(racket).toBeDefined();
    expect(racket?.active).toBe(true);
    expect(racket?.syndicateId).toBe("shadow_cartel");
    expect(racket?.cost).toBe(15);

    // Initial merchant gold is 150. Extorted 50 gold. Merchant gold is now 100.
    expect(state.merchantGold?.["merchant_npc"]).toBe(100);

    // Extorted 50 gold split equally between 2 members (player and alice) -> 25 gold each.
    expect(state.vars["gold"]).toBe(125); // Player had 100 + 25 = 125
    expect(state.vars["gold_alice"]).toBe(125); // Alice had 100 + 25 = 125
    expect(state.vars["totalExtortionGoldCollected"]).toBe(50);
  });

  it("should collect passive protection fees when stepping if syndicate controls the room turf", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 100, gold_alice: 100, totalExtortionGoldCollected: 50 },
      agentsInit: ["player", "alice"],
    });

    state.syndicates = {
      shadow_cartel: {
        id: "shadow_cartel",
        name: "Shadow Cartel",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
      },
    };

    state.protectionRackets = {
      merchant_npc: {
        merchantId: "merchant_npc",
        syndicateId: "shadow_cartel",
        cost: 15,
        timestamp: 1010,
        active: true,
      },
    };

    state.merchantGold = {
      merchant_npc: 100,
    };

    // Case A: Turf is not controlled by shadow_cartel. Restocking should NOT collect protection fee.
    state.step = 5;
    let tickedState = tickEconomy(state, mockPack);
    expect(tickedState.merchantGold?.["merchant_npc"]).toBe(100); // Unchanged

    // Case B: Claim turf for shadow_cartel
    state.syndicateTurfClaims = {
      market: {
        roomId: "market",
        syndicateId: "shadow_cartel",
        timestamp: 1020,
        dominance: 50,
      },
    };
    state.syndicateTurf = {
      market: "shadow_cartel",
    };

    // Restocking tick at step 5 should collect protection fee!
    tickedState = tickEconomy(state, mockPack);
    // Merchant gold: 100 - 15 = 85
    expect(tickedState.merchantGold?.["merchant_npc"]).toBe(85);
    // Split 15 gold equally -> 7 gold each (due to integer division share Math.floor(15/2) = 7)
    expect(tickedState.vars["gold"]).toBe(107);
    expect(tickedState.vars["gold_alice"]).toBe(107);
    expect(tickedState.vars["totalExtortionGoldCollected"]).toBe(65); // 50 + 15 = 65
  });

  it("should levy extortion tolls on non-allied agents entering syndicate-controlled turf", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 100, gold_alice: 100, gold_bob: 100 },
      agentsInit: ["player", "alice", "bob"],
    });

    state.syndicates = {
      shadow_cartel: {
        id: "shadow_cartel",
        name: "Shadow Cartel",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
      },
    };

    state.syndicateTurfClaims = {
      secret_passage: {
        roomId: "secret_passage",
        syndicateId: "shadow_cartel",
        timestamp: 1020,
        dominance: 50,
      },
    };
    state.syndicateTurf = {
      secret_passage: "shadow_cartel",
    };

    // Case A: Bob (non-allied) has 100 gold. Moves into secret_passage.
    // Base extortion toll is 15 gold. Bob should pay 15 gold.
    const resBob = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: {
          type: "MOVE",
          direction: "NORTH",
        },
      },
      mockPack
    );

    expect(resBob.ok).toBe(true);
    const stateBob = resBob.state;
    // Bob paid 15 gold -> gold_bob is 85
    expect(stateBob.vars["gold_bob"]).toBe(85);
    // Extorted 15 gold split equally among 2 members -> 7 gold each added
    expect(stateBob.vars["gold"]).toBe(107);
    expect(stateBob.vars["gold_alice"]).toBe(107);
    expect(stateBob.vars["totalExtortionGoldCollected"]).toBe(15);

    // Case B: Player (member/allied) moves into secret_passage. Should NOT pay extortion toll.
    const resPlayer = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "MOVE",
          direction: "NORTH",
        },
      },
      mockPack
    );
    expect(resPlayer.ok).toBe(true);
    const statePlayer = resPlayer.state;
    expect(statePlayer.vars["gold"]).toBe(100); // Unchanged
    expect(statePlayer.vars["totalExtortionGoldCollected"]).toBeUndefined();

    // Case C: Bob does not have enough gold to afford toll -> Should be rejected
    let poorState = { ...state };
    poorState.vars["gold_bob"] = 5; // Bob only has 5 gold, requires 15
    const resPoor = multiAgentStep(
      poorState,
      {
        agentId: "bob",
        action: {
          type: "MOVE",
          direction: "NORTH",
        },
      },
      mockPack
    );
    expect(resPoor.ok).toBe(false);
    expect(resPoor.rejectionReason).toContain("afford the syndicate extortion toll");
  });

  it("should synchronize active protection rackets across P2P gossip nodes", () => {
    (mockPack as any).start = "market";
    const nodeA = new GossipNode("alice", mockPack, 42);
    const nodeB = new GossipNode("bob", mockPack, 42);
    nodeA.connect(nodeB);

    // Initial racket list is empty
    expect(nodeA.localState.protectionRackets?.["merchant_npc"]).toBeUndefined();
    expect(nodeB.localState.protectionRackets?.["merchant_npc"]).toBeUndefined();

    // Alice registers a syndicate and demands protection from Honest Bob
    const createRes = nodeA.executeLocalAction({
      type: "CREATE_SYNDICATE",
      id: "shadow_cartel",
      name: "Shadow Cartel",
      members: ["alice", "bob"],
      timestamp: 1000,
    } as any);
    expect(createRes.ok).toBe(true);

    const demandRes = nodeA.executeLocalAction({
      type: "DEMAND_PROTECTION",
      merchantId: "merchant_npc",
      syndicateId: "shadow_cartel",
      timestamp: 1010,
    } as any);
    expect(demandRes.ok).toBe(true);

    expect(nodeA.localState.protectionRackets?.["merchant_npc"]).toBeDefined();
    // Bob has not heard from Alice yet
    expect(nodeB.localState.protectionRackets?.["merchant_npc"]).toBeUndefined();

    // Alice gossips to Bob
    nodeA.gossip();

    // Bob now has synchronized protection rackets
    expect(nodeB.localState.protectionRackets?.["merchant_npc"]).toBeDefined();
    expect(nodeB.localState.protectionRackets?.["merchant_npc"].active).toBe(true);
    expect(nodeB.localState.protectionRackets?.["merchant_npc"].syndicateId).toBe("shadow_cartel");

    // Sync back to Alice so clocks align perfectly
    nodeB.gossip();

    const hashA = computeStateHash(nodeA.localState);
    const hashB = computeStateHash(nodeB.localState);
    expect(hashA).toBe(hashB);
  });
});
