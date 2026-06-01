import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate Espionage Networks & Wiretapping (AF-64)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "espionage_test_pack",
      title: "Espionage and Wiretapping Test Pack",
      start_room: "safehouse_room",
      vars_init: { gold: 1000 },
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
        description: "A room with active trade operations.",
        objects: [],
        npcs: ["merchant_timmy"],
        exits: [
          {
            direction: "SOUTH",
            to: "safehouse_room",
          },
        ],
      },
    ],
    objects: [],
    npcs: [
      {
        id: "merchant_timmy",
        name: "Merchant Timmy",
        description: "A local trader.",
        gold: 200,
        restock_interval: 10,
        possible_items: [],
        dialogue: {
          root: "root_node",
          nodes: [
            {
              id: "root_node",
              npc_text: "Hello!",
              topics: [],
            },
          ],
        },
      },
    ],
  });

  it("should handle ESTABLISH_ESPIONAGE_NETWORK validations and deduct gold", () => {
    let state = createInitialState({
      seed: 42,
      start: "safehouse_room",
      varsInit: { gold: 50, gold_agent_a: 500 },
      agentsInit: ["agent_a"],
    });

    state.syndicates = {
      syndicate_shadow: {
        id: "syndicate_shadow",
        name: "Shadow Syndicate",
        members: ["agent_a"],
        definedBy: "agent_a",
        timestamp: 1000,
      },
    };

    // 1. Rejected if the room is not faction-controlled
    const noFactionCheck = multiAgentStep(
      state,
      {
        agentId: "agent_a",
        action: {
          type: "ESTABLISH_ESPIONAGE_NETWORK",
          roomId: "front_room",
          syndicateId: "syndicate_shadow",
          cost: 100,
          timestamp: 1001,
        } as any,
      },
      mockPack
    );
    expect(noFactionCheck.ok).toBe(false);
    expect(noFactionCheck.rejectionReason).toContain("is not faction-controlled");

    // Make it faction-controlled
    state.territoryControl = { front_room: "rangers" };

    // 2. Rejected if non-member attempts to establish
    const nonMemberCheck = multiAgentStep(
      state,
      {
        agentId: "agent_b",
        action: {
          type: "ESTABLISH_ESPIONAGE_NETWORK",
          roomId: "front_room",
          syndicateId: "syndicate_shadow",
          cost: 100,
          timestamp: 1001,
        } as any,
      },
      mockPack
    );
    expect(nonMemberCheck.ok).toBe(false);
    expect(nonMemberCheck.rejectionReason).toContain("is not a member of syndicate");

    // 3. Rejected if agent has insufficient gold
    const poorAgentCheck = multiAgentStep(
      state,
      {
        agentId: "agent_a",
        action: {
          type: "ESTABLISH_ESPIONAGE_NETWORK",
          roomId: "front_room",
          syndicateId: "syndicate_shadow",
          cost: 1000,
          timestamp: 1001,
        } as any,
      },
      mockPack
    );
    expect(poorAgentCheck.ok).toBe(false);
    expect(poorAgentCheck.rejectionReason).toContain("Insufficient gold");

    // 4. Successful establishment
    const successCheck = multiAgentStep(
      state,
      {
        agentId: "agent_a",
        action: {
          type: "ESTABLISH_ESPIONAGE_NETWORK",
          roomId: "front_room",
          syndicateId: "syndicate_shadow",
          cost: 100,
          timestamp: 1001,
        } as any,
      },
      mockPack
    );
    expect(successCheck.ok).toBe(true);
    expect(successCheck.state.vars.gold_agent_a).toBe(400); // 500 - 100
    expect(successCheck.state.espionageNetworks?.front_room).toBeDefined();
    expect(successCheck.state.espionageNetworks?.front_room.syndicateId).toBe("syndicate_shadow");
    expect(successCheck.state.espionageNetworks?.front_room.cost).toBe(100);
    expect(successCheck.state.journal[successCheck.state.journal.length - 1]).toContain("Established espionage network");
  });

  it("should handle PLACE_WIRETAP validations and deduct gold", () => {
    let state = createInitialState({
      seed: 42,
      start: "safehouse_room",
      varsInit: { gold: 50, gold_agent_a: 500 },
      agentsInit: ["agent_a"],
    });

    state.syndicates = {
      syndicate_shadow: {
        id: "syndicate_shadow",
        name: "Shadow Syndicate",
        members: ["agent_a"],
        definedBy: "agent_a",
        timestamp: 1000,
      },
    };

    // 1. Rejected if the room has no merchant/NPC/front business
    const noMerchantCheck = multiAgentStep(
      state,
      {
        agentId: "agent_a",
        action: {
          type: "PLACE_WIRETAP",
          roomId: "safehouse_room", // safehouse has no npcs
          syndicateId: "syndicate_shadow",
          cost: 100,
          timestamp: 1001,
        } as any,
      },
      mockPack
    );
    expect(noMerchantCheck.ok).toBe(false);
    expect(noMerchantCheck.rejectionReason).toContain("is not a merchant transaction hub");

    // 2. Successful placement in room with npc (front_room has merchant_timmy)
    const successCheck = multiAgentStep(
      state,
      {
        agentId: "agent_a",
        action: {
          type: "PLACE_WIRETAP",
          roomId: "front_room",
          syndicateId: "syndicate_shadow",
          cost: 150,
          timestamp: 1001,
        } as any,
      },
      mockPack
    );
    expect(successCheck.ok).toBe(true);
    expect(successCheck.state.vars.gold_agent_a).toBe(350); // 500 - 150
    expect(successCheck.state.wiretaps?.front_room).toBeDefined();
    expect(successCheck.state.wiretaps?.front_room.syndicateId).toBe("syndicate_shadow");
    expect(successCheck.state.wiretaps?.front_room.cost).toBe(150);
  });

  it("should allow espionage networks to intercept faction taxes periodically in tickEconomy", () => {
    let state = createInitialState({
      seed: 42,
      start: "front_room",
      varsInit: { gold: 0, gold_agent_a: 0 },
      agentsInit: ["agent_a"],
    });

    state.syndicates = {
      syndicate_shadow: {
        id: "syndicate_shadow",
        name: "Shadow Syndicate",
        members: ["agent_a"],
        definedBy: "agent_a",
        timestamp: 1000,
      },
    };

    // Rangers faction controls front_room, and player has 20 rep (which generates 2 gold base tax per tick)
    state.territoryControl = { front_room: "rangers" };
    state.factionRep = { rangers: 20 };
    state.step = 5; // economy ticks every 5 steps

    // 1. Establish Espionage Network in front_room
    state.espionageNetworks = {
      front_room: {
        roomId: "front_room",
        syndicateId: "syndicate_shadow",
        cost: 100,
        timestamp: 1000,
      },
    };

    // 2. Run tickEconomy
    const ticked = tickEconomy(state, mockPack);

    // Total room tax is Math.max(1, Math.floor(rep / 10)) = 2.
    // Intercepted: Math.max(1, Math.floor(2 * 0.2)) = 1 gold.
    // Faction tax collected by player = 2 - 1 = 1 gold.
    // Intercepted gold distributed to agent_a (sole member of syndicate_shadow) = 1 gold.
    expect(ticked.vars.gold).toBe(1); // Faction tax collected
    expect(ticked.vars.gold_agent_a).toBe(1); // Intercepted tax distributed to member
    expect(ticked.journal.some(log => log.includes("intercepted 1 gold of faction taxes"))).toBe(true);
  });

  it("should allow wiretaps to intercept rival turf taxes and leak gossip transaction maps periodically in tickEconomy", () => {
    let state = createInitialState({
      seed: 42,
      start: "front_room",
      varsInit: { gold_agent_a: 0, gold_agent_b: 0 },
      agentsInit: ["agent_a", "agent_b"],
    });

    // syndicate_shadow: has agent_a
    // syndicate_rival: has agent_b
    state.syndicates = {
      syndicate_shadow: {
        id: "syndicate_shadow",
        name: "Shadow Syndicate",
        members: ["agent_a"],
        definedBy: "agent_a",
        timestamp: 1000,
      },
      syndicate_rival: {
        id: "syndicate_rival",
        name: "Rival Syndicate",
        members: ["agent_b"],
        definedBy: "agent_b",
        timestamp: 1000,
        turfTaxRate: 10,
      },
    };

    // Rival controls the turf and has a front business operating there
    state.syndicateTurf = { front_room: "syndicate_rival" };
    state.frontBusinesses = {
      merchant_timmy: {
        id: "front_timmy",
        merchantId: "merchant_timmy",
        roomId: "front_room",
        syndicateId: "syndicate_rival",
        level: 1,
        launderingCapacity: 1000,
        launderingRate: 100,
        dirtyGold: 0,
        cleanGold: 100, // front business has 100 clean gold
        timestamp: 1000,
      },
    };

    // Place wiretap in front_room owned by syndicate_shadow (rival to controlling syndicate)
    state.wiretaps = {
      front_room: {
        roomId: "front_room",
        syndicateId: "syndicate_shadow",
        cost: 100,
        timestamp: 1000,
      },
    };

    // Create a transaction by rival agent to leak
    state.transactionJournal = [
      {
        agentId: "agent_b",
        sequenceNumber: 2,
        action: { type: "MOVE", direction: "NORTH" },
        stateHashBefore: "hash_before",
        stateHashAfter: "hash_after",
        timestamp: 123456,
        ok: true,
      },
    ];

    state.step = 5;

    // Run tickEconomy
    const ticked = tickEconomy(state, mockPack);

    // Turf tax rate is 10. No guards, no outpost, so fullTaxAmount is Math.min(10, 100) = 10 gold.
    // Wiretap intercepts Math.max(1, Math.floor(10 * 0.2)) = 2 gold.
    // Syndicate shadow member agent_a gets 2 gold.
    // Rival syndicate members agent_b gets 8 gold.
    expect(ticked.vars.gold_agent_a).toBe(2);
    expect(ticked.vars.gold_agent_b).toBe(8);
    expect(ticked.journal.some(log => log.includes("intercepted 2 gold of turf taxes"))).toBe(true);

    // Assert that the wiretap leaked gossip transaction maps
    expect(ticked.cooperativeSyncLog).toBeDefined();
    expect(ticked.cooperativeSyncLog?.some(log => log.includes("[Wiretap Leak] Room front_room intercepted transaction"))).toBe(true);
  });

  it("should merge espionage networks and wiretaps states correctly during gossip merge (LWW CRDT)", () => {
    let stateA = createInitialState({ seed: 42, start: "safehouse_room" });
    let stateB = createInitialState({ seed: 42, start: "safehouse_room" });

    stateA.espionageNetworks = {
      front_room: {
        roomId: "front_room",
        syndicateId: "syndicate_shadow",
        cost: 100,
        timestamp: 1000,
      },
    };

    stateB.espionageNetworks = {
      front_room: {
        roomId: "front_room",
        syndicateId: "syndicate_rival",
        cost: 150,
        timestamp: 2000, // newer timestamp!
      },
    };

    stateA.wiretaps = {
      front_room: {
        roomId: "front_room",
        syndicateId: "syndicate_shadow",
        cost: 100,
        timestamp: 3000, // newer timestamp!
      },
    };

    stateB.wiretaps = {
      front_room: {
        roomId: "front_room",
        syndicateId: "syndicate_rival",
        cost: 150,
        timestamp: 1000,
      },
    };

    const merged = mergeMonotonicStateFields(stateA, stateB);

    // espionageNetworks: B wins because timestamp 2000 > 1000
    expect(merged.espionageNetworks?.front_room.syndicateId).toBe("syndicate_rival");
    expect(merged.espionageNetworks?.front_room.cost).toBe(150);

    // wiretaps: A wins because timestamp 3000 > 1000
    expect(merged.wiretaps?.front_room.syndicateId).toBe("syndicate_shadow");
    expect(merged.wiretaps?.front_room.cost).toBe(100);
  });
});
