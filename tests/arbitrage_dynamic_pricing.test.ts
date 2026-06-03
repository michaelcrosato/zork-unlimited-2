import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { GossipNode, mergeMonotonicStateFields } from "../src/core/gossip.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { calculateTradePrice, findArbitrageOpportunities } from "../src/core/economy.js";
import { computeStateHash } from "../src/core/hash.js";

describe("Arbitrage and Dynamic Inventory-Based Economy (AF-37)", () => {
  const econPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "arbitrage_test_pack",
      title: "Arbitrage and Dynamic Pricing Test",
      start_room: "market_east",
      vars_init: {
        gold: 100,
      },
      flags_init: [],
    },
    rooms: [
      {
        id: "market_east",
        name: "Market East",
        description: "A prosperous eastern market square.",
        objects: [],
        npcs: ["merchant_rich"],
        exits: [
          {
            direction: "west",
            to: "market_west",
            conditions: [],
          },
        ],
      },
      {
        id: "market_west",
        name: "Market West",
        description: "A dry western market square.",
        objects: [],
        npcs: ["merchant_poor"],
        exits: [
          {
            direction: "east",
            to: "market_east",
            conditions: [],
          },
        ],
      },
    ],
    objects: [
      {
        id: "iron_sword",
        name: "iron sword",
        aliases: ["sword"],
        description: "A sharp iron sword.",
        takeable: true,
        cost: 20,
      },
    ],
    npcs: [
      {
        id: "merchant_rich",
        name: "Merchant Rich",
        description: "A wealthy merchant with large stock.",
        gold: 100,
        gold_limit: 500,
        dynamic_pricing: true,
        possible_items: ["iron_sword"],
        dialogue: {
          root: "root",
          nodes: [{ id: "root", npc_text: "Let's trade.", topics: [] }],
        },
      },
      {
        id: "merchant_poor",
        name: "Merchant Poor",
        description: "A poor merchant with no stock.",
        gold: 100,
        gold_limit: 500,
        dynamic_pricing: true,
        possible_items: ["iron_sword"],
        dialogue: {
          root: "root",
          nodes: [{ id: "root", npc_text: "I need items.", topics: [] }],
        },
      },
    ],
    win_conditions: [],
    endings: [],
  });

  it("should dynamically scale BUY and SELL prices based on merchant stock levels under dynamic pricing", () => {
    let state = createInitialState({
      seed: 42,
      start: "market_east",
      varsInit: econPack.meta.vars_init,
    });

    const richNpc = econPack.npcs.find((n) => n.id === "merchant_rich")!;
    const swordObj = econPack.objects.find((o) => o.id === "iron_sword")!;

    // 1. BUY Pricing check (player buys from merchant)
    // stock count = 0
    state.merchantInventories = { merchant_rich: [] };
    let buyPrice0 = calculateTradePrice(state, richNpc, swordObj, swordObj.cost ?? 20, true);
    expect(buyPrice0).toBe(Math.round(20 * 1.5)); // 30

    // stock count = 1
    state.merchantInventories = { merchant_rich: ["iron_sword"] };
    let buyPrice1 = calculateTradePrice(state, richNpc, swordObj, swordObj.cost ?? 20, true);
    expect(buyPrice1).toBe(Math.round(20 * 1.2)); // 24

    // stock count = 2
    state.merchantInventories = { merchant_rich: ["iron_sword", "iron_sword"] };
    let buyPrice2 = calculateTradePrice(state, richNpc, swordObj, swordObj.cost ?? 20, true);
    expect(buyPrice2).toBe(Math.round(20 * 1.0)); // 20

    // stock count = 3
    state.merchantInventories = { merchant_rich: ["iron_sword", "iron_sword", "iron_sword"] };
    let buyPrice3 = calculateTradePrice(state, richNpc, swordObj, swordObj.cost ?? 20, true);
    expect(buyPrice3).toBe(Math.round(20 * (1.0 - 1 * 0.15))); // 20 * 0.85 = 17

    // 2. SELL Pricing check (player sells to merchant)
    // stock count = 0
    state.merchantInventories = { merchant_rich: [] };
    let sellPrice0 = calculateTradePrice(state, richNpc, swordObj, swordObj.cost ?? 20, false);
    expect(sellPrice0).toBe(Math.round(20 * 1.5)); // 30

    // stock count = 1
    state.merchantInventories = { merchant_rich: ["iron_sword"] };
    let sellPrice1 = calculateTradePrice(state, richNpc, swordObj, swordObj.cost ?? 20, false);
    expect(sellPrice1).toBe(Math.round(20 * 1.0)); // 20

    // stock count = 2
    state.merchantInventories = { merchant_rich: ["iron_sword", "iron_sword"] };
    let sellPrice2 = calculateTradePrice(state, richNpc, swordObj, swordObj.cost ?? 20, false);
    expect(sellPrice2).toBe(Math.round(20 * (1.0 - 1 * 0.2))); // 20 * 0.8 = 16
  });

  it("should synchronize merchant inventories and gold states between Gossip mesh nodes using LWW", () => {
    const nodeA = new GossipNode("alice", econPack, 42);
    const nodeB = new GossipNode("bob", econPack, 42);

    nodeA.connect(nodeB);

    // Initial sync
    nodeA.gossip();
    nodeB.gossip();

    // Node A sets merchant state at a higher step (e.g., step 5)
    nodeA.localState.step = 5;
    nodeA.localState.merchantInventories = {
      merchant_rich: ["iron_sword"],
    };
    nodeA.localState.merchantGold = {
      merchant_rich: 150,
    };
    nodeA.localState.merchantLastUpdated = {
      merchant_rich: 5,
    };

    // Node B has a state at step 1
    nodeB.localState.step = 1;
    nodeB.localState.merchantInventories = {
      merchant_rich: ["iron_sword", "iron_sword"],
    };
    nodeB.localState.merchantGold = {
      merchant_rich: 80,
    };
    nodeB.localState.merchantLastUpdated = {
      merchant_rich: 1,
    };

    // Perform sync round using mergeMonotonicStateFields
    // Bob should accept Alice's merchant state because step 5 > step 1 (LWW)
    nodeB.localState = mergeMonotonicStateFields(nodeB.localState, nodeA.localState);

    expect(nodeB.localState.merchantInventories?.["merchant_rich"]).toEqual(["iron_sword"]);
    expect(nodeB.localState.merchantGold?.["merchant_rich"]).toBe(150);

    // Now test tie-breaking (equal steps)
    nodeA.localState.merchantLastUpdated = { merchant_rich: 5 };
    nodeA.localState.merchantInventories = { merchant_rich: ["iron_sword"] }; // JSON string: ["iron_sword"]
    nodeB.localState.merchantLastUpdated = { merchant_rich: 5 };
    nodeB.localState.merchantInventories = { merchant_rich: ["iron_sword", "iron_sword"] }; // JSON string: ["iron_sword","iron_sword"]

    // ["iron_sword","iron_sword"] vs ["iron_sword"]. "[\"iron_sword\"]" alphabetically compares before "[\"iron_sword\",\"iron_sword\"]"
    // Since B.localeCompare(A) < 0, let's check which is selected.
    // In our code: if (invBStr.localeCompare(invAStr) < 0) B overwrites A.
    // "[\"iron_sword\"]" (A) vs "[\"iron_sword\",\"iron_sword\"]" (B).
    // Let's force A to be chosen by calling merge directly.
    nodeB.localState = mergeMonotonicStateFields(nodeB.localState, nodeA.localState);
    nodeA.localState = mergeMonotonicStateFields(nodeA.localState, nodeB.localState);
    
    // Both nodes should converge to the same state
    expect(nodeA.localState.merchantInventories).toEqual(nodeB.localState.merchantInventories);
    expect(nodeA.localState.merchantGold).toEqual(nodeB.localState.merchantGold);
    expect(nodeA.localState.merchantLastUpdated).toEqual(nodeB.localState.merchantLastUpdated);
  });

  it("should find and exploit arbitrage opportunities between different territory merchants", () => {
    let state = createInitialState({
      seed: 42,
      start: "market_east",
      varsInit: econPack.meta.vars_init,
    });

    // Setup market_east merchant (merchant_rich) with 3 iron_swords (BUY price is 17 gold)
    state.merchantInventories = {
      merchant_rich: ["iron_sword", "iron_sword", "iron_sword"],
      merchant_poor: [], // merchant_poor has 0 stock (SELL price is 30 gold!)
    };
    state.merchantGold = {
      merchant_rich: 100,
      merchant_poor: 100,
    };

    // 1. Check arbitrage opportunities
    const opportunities = findArbitrageOpportunities(state, econPack);
    expect(opportunities).toHaveLength(3);
    expect(opportunities[0]).toMatchObject({
      item: "iron_sword",
      buyNpc: "merchant_rich",
      sellNpc: "merchant_poor",
      cost: 17,
      payout: 30,
      profit: 13,
    });

    // 2. Exploit arbitrage!
    // Buy iron_sword from merchant_rich
    const buyResult = step(state, { type: "BUY", item: "iron_sword", npc: "merchant_rich" }, econPack);
    expect(buyResult.ok).toBe(true);
    state = buyResult.state;
    expect(state.vars["gold"]).toBe(83); // 100 - 17 = 83
    expect(state.inventory).toContain("iron_sword");

    // Move to market_west
    const moveResult = step(state, { type: "MOVE", direction: "west" }, econPack);
    expect(moveResult.ok).toBe(true);
    state = moveResult.state;

    // Sell iron_sword to merchant_poor
    const sellResult = step(state, { type: "SELL", item: "iron_sword", npc: "merchant_poor" }, econPack);
    expect(sellResult.ok).toBe(true);
    state = sellResult.state;

    // Player gold should now be 113! Initial was 100.
    // 83 + 30 = 113. Successful 13 gold profit arbitrage loop!
    expect(state.vars["gold"]).toBe(113);
    expect(state.inventory).not.toContain("iron_sword");
    expect(state.merchantInventories?.["merchant_poor"]).toContain("iron_sword");
  });
});
