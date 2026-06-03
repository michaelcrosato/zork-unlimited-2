import { describe, it, expect } from "vitest";
import { createInitialState, reconcileTariffPolicies } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { GossipNode } from "../src/core/gossip.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";
import { calculateTradePrice } from "../src/core/economy.js";

describe("Decentralized Faction Merchant Licensing and Tariff System Tests", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "merchant_tariff_pack",
      title: "Merchant Licensing Test Pack",
      start_room: "clearing",
      vars_init: { gold: 100 },
      flags_init: [],
    },
    factions: [
      {
        id: "rangers",
        name: "Forest Rangers",
        description: "Guardians of the forest.",
        initial_rep: 10,
      },
      {
        id: "shadow_guild",
        name: "Shadow Guild",
        description: "Silent controllers of the night.",
        initial_rep: -5,
      },
    ],
    rooms: [
      {
        id: "clearing",
        name: "Clearing",
        description: "A sunny clearing.",
        objects: [],
        npcs: ["merchant_npc"],
        exits: [
          {
            direction: "north",
            to: "cave",
            conditions: [],
          },
        ],
      },
      {
        id: "cave",
        name: "Dark Cave",
        description: "A damp cave.",
        objects: [],
        npcs: [],
        exits: [],
      },
    ],
    objects: [
      {
        id: "wooden_shield",
        name: "Wooden Shield",
        aliases: ["shield"],
        description: "A sturdy shield.",
        cost: 40,
        takeable: true,
      },
    ],
    npcs: [
      {
        id: "merchant_npc",
        name: "Garrick",
        description: "A local trader.",
        gold: 100,
        possible_items: ["wooden_shield"],
        dialogue: {
          root: "root_node",
          nodes: [
            {
              id: "root_node",
              npc_text: "Welcome!",
              topics: [],
            },
          ],
        },
      },
    ],
    win_conditions: [],
    endings: [],
  });

  it("should validate and define merchant licensing rules with LWW arbitration", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
      varsInit: { gold: 100 },
      factionRepInit: { rangers: 10, shadow_guild: -5 },
    });

    expect(state.merchantLicensings).toBeUndefined();

    // 1. Try defining with invalid faction
    const resFail1 = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "DEFINE_MERCHANT_LICENSING",
          factionId: "unknown_faction",
          licenseCost: 50,
          tariffRate: 15,
          timestamp: 100,
        } as any,
      },
      mockPack
    );
    expect(resFail1.ok).toBe(false);
    expect(resFail1.rejectionReason).toContain("is not a valid faction");

    // 2. Try defining with negative cost
    const resFail2 = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "DEFINE_MERCHANT_LICENSING",
          factionId: "rangers",
          licenseCost: -10,
          tariffRate: 15,
          timestamp: 100,
        } as any,
      },
      mockPack
    );
    expect(resFail2.ok).toBe(false);
    expect(resFail2.rejectionReason).toContain("must be a non-negative integer");

    // 3. Try defining with negative tariff
    const resFail3 = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "DEFINE_MERCHANT_LICENSING",
          factionId: "rangers",
          licenseCost: 50,
          tariffRate: -5,
          timestamp: 100,
        } as any,
      },
      mockPack
    );
    expect(resFail3.ok).toBe(false);
    expect(resFail3.rejectionReason).toContain("must be a non-negative integer");

    // 4. Valid definition
    const resOk1 = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "DEFINE_MERCHANT_LICENSING",
          factionId: "rangers",
          licenseCost: 40,
          tariffRate: 10,
          timestamp: 100,
        } as any,
      },
      mockPack
    );
    expect(resOk1.ok).toBe(true);
    expect(resOk1.state.merchantLicensings?.["rangers"]).toEqual({
      factionId: "rangers",
      licenseCost: 40,
      tariffRate: 10,
      definedBy: "alice",
      timestamp: 100,
    });
    // The definer's initial vote should be registered
    expect(resOk1.state.tariffVotes?.["rangers"]?.["alice"]).toEqual({
      rate: 10,
      timestamp: 100,
    });
    expect(resOk1.state.tariffPolicy?.["rangers"]).toBe(10);

    // 5. LWW overwrite with higher timestamp
    const resOk2 = multiAgentStep(
      resOk1.state,
      {
        agentId: "bob",
        action: {
          type: "DEFINE_MERCHANT_LICENSING",
          factionId: "rangers",
          licenseCost: 60,
          tariffRate: 20,
          timestamp: 200,
        } as any,
      },
      mockPack
    );
    expect(resOk2.ok).toBe(true);
    expect(resOk2.state.merchantLicensings?.["rangers"]).toEqual({
      factionId: "rangers",
      licenseCost: 60,
      tariffRate: 20,
      definedBy: "bob",
      timestamp: 200,
    });
    expect(resOk2.state.tariffPolicy?.["rangers"]).toBe(20);

    // 6. Outdated timestamp should be ignored
    const resOk3 = multiAgentStep(
      resOk2.state,
      {
        agentId: "charlie",
        action: {
          type: "DEFINE_MERCHANT_LICENSING",
          factionId: "rangers",
          licenseCost: 50,
          tariffRate: 15,
          timestamp: 150, // 150 < 200
        } as any,
      },
      mockPack
    );
    expect(resOk3.ok).toBe(true);
    expect(resOk3.state.merchantLicensings?.["rangers"]?.definedBy).toBe("bob");
  });

  it("should handle tariff rate voting and majority tie-breaker consensus", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
      factionRepInit: { rangers: 10 },
    });

    // Setup base licensing definition
    state = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "DEFINE_MERCHANT_LICENSING",
          factionId: "rangers",
          licenseCost: 50,
          tariffRate: 10,
          timestamp: 100,
        } as any,
      },
      mockPack
    ).state;

    expect(state.tariffPolicy?.["rangers"]).toBe(10);

    // Vote 1: Bob votes 25%
    state = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: {
          type: "VOTE_MERCHANT_TARIFF",
          factionId: "rangers",
          tariffRate: 25,
          timestamp: 110,
        } as any,
      },
      mockPack
    ).state;
    // Tie between 10 and 25. Sort descending means 25 wins!
    expect(state.tariffPolicy?.["rangers"]).toBe(25);

    // Vote 2: Charlie votes 10%
    state = multiAgentStep(
      state,
      {
        agentId: "charlie",
        action: {
          type: "VOTE_MERCHANT_TARIFF",
          factionId: "rangers",
          tariffRate: 10,
          timestamp: 120,
        } as any,
      },
      mockPack
    ).state;
    // Two votes for 10%, one vote for 25%. Majority is 10%!
    expect(state.tariffPolicy?.["rangers"]).toBe(10);
  });

  it("should process BUY_MERCHANT_LICENSE, checking and deducting gold and registering the license in state", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
      varsInit: { gold: 100, gold_bob: 30 },
      factionRepInit: { rangers: 10 },
    });

    // 1. Try to buy before license is defined
    const resFail1 = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "BUY_MERCHANT_LICENSE",
          factionId: "rangers",
          timestamp: 100,
        } as any,
      },
      mockPack
    );
    expect(resFail1.ok).toBe(false);
    expect(resFail1.rejectionReason).toContain("does not exist in state");

    // Define the license rules
    state = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "DEFINE_MERCHANT_LICENSING",
          factionId: "rangers",
          licenseCost: 50,
          tariffRate: 15,
          timestamp: 100,
        } as any,
      },
      mockPack
    ).state;

    // 2. Try to buy with insufficient gold
    state.vars["gold"] = 20; // license costs 50
    const resFail2 = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "BUY_MERCHANT_LICENSE",
          factionId: "rangers",
          timestamp: 110,
        } as any,
      },
      mockPack
    );
    expect(resFail2.ok).toBe(false);
    expect(resFail2.rejectionReason).toContain("Insufficient gold");

    // 3. Successful purchase for player
    state.vars["gold"] = 100;
    const resOk1 = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "BUY_MERCHANT_LICENSE",
          factionId: "rangers",
          timestamp: 120,
        } as any,
      },
      mockPack
    );
    expect(resOk1.ok).toBe(true);
    expect(resOk1.state.vars["gold"]).toBe(50); // 100 - 50 cost
    expect(resOk1.state.merchantLicenses?.["player"]).toContain("rangers");

    // 4. Try to purchase twice
    const resFail3 = multiAgentStep(
      resOk1.state,
      {
        agentId: "player",
        action: {
          type: "BUY_MERCHANT_LICENSE",
          factionId: "rangers",
          timestamp: 130,
        } as any,
      },
      mockPack
    );
    expect(resFail3.ok).toBe(false);
    expect(resFail3.rejectionReason).toContain("already has a license");

    // 5. Successful purchase for peer agent (Bob)
    const resBob = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: {
          type: "BUY_MERCHANT_LICENSE",
          factionId: "rangers",
          timestamp: 120,
        } as any,
      },
      mockPack
    );
    // Bob starts with 30 gold (gold_bob). License costs 50, so Bob fails first:
    expect(resBob.ok).toBe(false);

    state.vars["gold_bob"] = 80;
    const resBobOk = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: {
          type: "BUY_MERCHANT_LICENSE",
          factionId: "rangers",
          timestamp: 125,
        } as any,
      },
      mockPack
    );
    expect(resBobOk.ok).toBe(true);
    expect(resBobOk.state.vars["gold_bob"]).toBe(30); // 80 - 50 cost
    expect(resBobOk.state.merchantLicenses?.["bob"]).toContain("rangers");
  });

  it("should levy tariffs on buy/sell actions in faction territories for unlicensed traders and waive them for licensed", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
      varsInit: { gold: 100 },
      factionRepInit: { rangers: 0 },
      territoryControlInit: { clearing: "rangers" },
    });

    const npc = { id: "merchant_npc", name: "Garrick" };
    const packObj = { id: "wooden_shield", cost: 100 };

    // 1. Baseline price with no merchant license/tariff defined
    const baseBuy = calculateTradePrice(state, npc, packObj, 100, true, "player");
    expect(baseBuy).toBe(100);

    // 2. Define licensing rules (50 cost, 20% tariff rate)
    state = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "DEFINE_MERCHANT_LICENSING",
          factionId: "rangers",
          licenseCost: 50,
          tariffRate: 20,
          timestamp: 100,
        } as any,
      },
      mockPack
    ).state;

    // Unlicensed BUY: cost is increased by 20%
    const unlicensedBuy = calculateTradePrice(state, npc, packObj, 100, true, "player");
    expect(unlicensedBuy).toBe(120); // 100 * 1.20 = 120

    // Unlicensed SELL: payout is decreased by 20%
    const unlicensedSell = calculateTradePrice(state, npc, packObj, 100, false, "player");
    expect(unlicensedSell).toBe(80); // 100 * 0.8 = 80

    // 3. Grant player a license
    state = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "BUY_MERCHANT_LICENSE",
          factionId: "rangers",
          timestamp: 110,
        } as any,
      },
      mockPack
    ).state;

    // Licensed BUY: no tariff applied!
    const licensedBuy = calculateTradePrice(state, npc, packObj, 100, true, "player");
    expect(licensedBuy).toBe(100);

    // Licensed SELL: no tariff applied!
    const licensedSell = calculateTradePrice(state, npc, packObj, 100, false, "player");
    expect(licensedSell).toBe(100);
  });

  it("should propagate merchant licensing definitions, license holdings, and consensus tariff rates across the Gossip mesh", () => {
    // Simulate P2P mesh network with two nodes: Alice and Bob
    const nodeA = new GossipNode("alice", mockPack, 42);
    const nodeB = new GossipNode("bob", mockPack, 42);

    nodeA.peers.set("bob", nodeB);
    nodeB.peers.set("alice", nodeA);

    // 1. Alice defines rangers merchant licensing rules
    const resA = nodeA.executeLocalAction({
      type: "DEFINE_MERCHANT_LICENSING",
      factionId: "rangers",
      licenseCost: 50,
      tariffRate: 15,
      timestamp: 100,
    } as any);
    expect(resA.ok).toBe(true);

    // Alice should have it locally
    expect(nodeA.localState.merchantLicensings?.["rangers"]?.licenseCost).toBe(50);
    expect(nodeA.localState.tariffPolicy?.["rangers"]).toBe(15);
    // Bob does not have it yet
    expect(nodeB.localState.merchantLicensings).toBeUndefined();

    // 2. Gossip from Alice to Bob
    nodeA.gossip();

    // Bob should converge and receive the definition and consensus tariff rate!
    expect(nodeB.localState.merchantLicensings?.["rangers"]?.licenseCost).toBe(50);
    expect(nodeB.localState.tariffPolicy?.["rangers"]).toBe(15);

    // 3. Bob votes for a higher tariff (25%) at t = 110
    const resB = nodeB.executeLocalAction({
      type: "VOTE_MERCHANT_TARIFF",
      factionId: "rangers",
      tariffRate: 25,
      timestamp: 110,
    } as any);
    expect(resB.ok).toBe(true);

    // Bob has his vote, tariff rate tie-breaks to 25% (as 25% > 15%)
    expect(nodeB.localState.tariffPolicy?.["rangers"]).toBe(25);
    // Alice still has 15%
    expect(nodeA.localState.tariffPolicy?.["rangers"]).toBe(15);

    // Gossip from Bob to Alice
    nodeB.gossip();

    // Alice converges and her policy upgrades to 25%!
    expect(nodeA.localState.tariffPolicy?.["rangers"]).toBe(25);

    // 4. Bob buys a license
    nodeB.localState.vars["gold_bob"] = 100;
    const resBobBuy = nodeB.executeLocalAction({
      type: "BUY_MERCHANT_LICENSE",
      factionId: "rangers",
      timestamp: 120,
    } as any);
    expect(resBobBuy.ok).toBe(true);
    expect(nodeB.localState.merchantLicenses?.["bob"]).toContain("rangers");

    // Alice does not know Bob has a license yet
    expect(nodeA.localState.merchantLicenses?.["bob"]).toBeUndefined();

    // Gossip from Bob to Alice
    nodeB.gossip();

    // Alice receives Bob's license purchase perfectly!
    expect(nodeA.localState.merchantLicenses?.["bob"]).toContain("rangers");
  });
});
