import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { GossipNode } from "../src/core/gossip.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";
import { calculateTradePrice, getMerchantTradeCaps } from "../src/core/economy.js";

describe("Decentralized Faction Reputation-Based Tariff Waivers & Merchant Trade Caps Tests", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "reputation_caps_pack",
      title: "Reputation and Caps Test Pack",
      start_room: "clearing",
      vars_init: { gold: 500 },
      flags_init: [],
    },
    factions: [
      {
        id: "rangers",
        name: "Forest Rangers",
        description: "Guardians of the forest.",
        initial_rep: -5, // Starts as Hostile to enforce caps deterministically in Gossip replays
      },
    ],
    rooms: [
      {
        id: "clearing",
        name: "Clearing",
        description: "A sunny clearing.",
        objects: [],
        npcs: ["merchant_npc"],
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
      {
        id: "expensive_gem",
        name: "Expensive Gem",
        aliases: ["gem"],
        description: "A precious gem.",
        cost: 200,
        takeable: true,
      },
    ],
    npcs: [
      {
        id: "merchant_npc",
        name: "Garrick",
        description: "A local trader.",
        gold: 300,
        faction: "rangers", // Explicit faction definition allows resolving NPC's faction directly
        possible_items: ["wooden_shield", "expensive_gem"],
        dialogue: {
          root: "root_node",
          nodes: [
            {
              id: "root_node",
              npc_text: "Welcome!",
              topics: [
                {
                  id: "ask_stock",
                  prompt: "Stock the shop",
                  end: true,
                  effects: [
                    {
                      npc_trade: {
                        npc_id: "merchant_npc",
                        action: "stock",
                        item: "wooden_shield",
                        success_msg: "Garrick stocks first item.",
                      },
                    },
                    {
                      npc_trade: {
                        npc_id: "merchant_npc",
                        action: "stock",
                        item: "expensive_gem",
                        success_msg: "Garrick stocks second item.",
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    ],
    win_conditions: [],
    endings: [],
  });

  it("should waive or discount tariffs based on faction reputation thresholds", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
      varsInit: { gold: 500 },
      factionRepInit: { rangers: 0 },
      territoryControlInit: { clearing: "rangers" },
    });

    const npc = { id: "merchant_npc", name: "Garrick", faction: "rangers" };
    const packObj = { id: "wooden_shield", cost: 100 };

    // Define merchant licensing rules with a cost of 50, tariff rate of 20%,
    // tariffWaiverThreshold at 20, and tariffDiscountThreshold at 10.
    state = multiAgentStep(state, {
      agentId: "alice",
      action: {
        type: "DEFINE_MERCHANT_LICENSING",
        factionId: "rangers",
        licenseCost: 50,
        tariffRate: 20,
        tariffWaiverThreshold: 20,
        tariffDiscountThreshold: 10,
        timestamp: 100,
      } as any,
    }, mockPack).state;

    // 1. Reputation = 0 (Unlicensed, below discount threshold)
    // Tariff applied at 100%: 100 * 1.20 = 120 gold
    state.factionRep!["rangers"] = 0;
    const priceRep0 = calculateTradePrice(state, npc, packObj, 100, true, "player");
    expect(priceRep0).toBe(120);

    // 2. Reputation = 10 (Unlicensed, qualifies for 50% discount)
    // control modifier discount (1.0 - 10 * 0.02 = 0.80)
    // Tariff applied at 50% (10% tariff rate): 80 * 1.10 = 88 gold
    state.factionRep!["rangers"] = 10;
    const priceRep10 = calculateTradePrice(state, npc, packObj, 100, true, "player");
    expect(priceRep10).toBe(88);

    // 3. Reputation = 20 (Unlicensed, qualifies for complete tariff waiver)
    // control modifier discount (1.0 - 20 * 0.02 = 0.60)
    // Tariff rate is completely waived (0% tariff rate): 60 gold
    state.factionRep!["rangers"] = 20;
    const priceRep20 = calculateTradePrice(state, npc, packObj, 100, true, "player");
    expect(priceRep20).toBe(60);
  });

  it("should enforce merchant trade transaction count and gold volume caps based on faction standing", () => {
    let state = createInitialState({
      seed: 42,
      start: "clearing",
      varsInit: { gold: 500 },
      factionRepInit: { rangers: -5 }, // Hostile standing: cap is max 1 transaction, max 50 gold volume
      territoryControlInit: { clearing: "rangers" },
    });

    // Make sure Garrick has the items in stock
    state.merchantInventories = {
      merchant_npc: ["wooden_shield", "expensive_gem"],
    };

    // 1. Hostile standing: max 1 transaction, max 50 gold volume
    const capsHostile = getMerchantTradeCaps(state, "rangers");
    expect(capsHostile.maxTransactions).toBe(1);
    expect(capsHostile.maxGoldVolume).toBe(50);

    // Try to buy expensive gem (cost 200 gold). Attempt should fail because it exceeds the 50 gold volume limit!
    const buyGemResult = step(state, { type: "BUY", item: "expensive_gem", npc: "merchant_npc" }, mockPack);
    expect(buyGemResult.ok).toBe(false);
    expect(buyGemResult.rejectionReason).toContain("Trade volume limit reached");

    // Buy wooden shield (cost 40 gold). It fits the volume limit (< 50) and first transaction.
    const buyShieldResult = step(state, { type: "BUY", item: "wooden_shield", npc: "merchant_npc" }, mockPack);
    expect(buyShieldResult.ok).toBe(true);
    
    // Now let's try to do a second trade (e.g. SELL the wooden shield back, payout is 40 gold).
    // It should fail because maxTransactions is 1 and we already have 1 trade in history!
    let nextState = buyShieldResult.state;
    const sellShieldResult = step(nextState, { type: "SELL", item: "wooden_shield", npc: "merchant_npc" }, mockPack);
    expect(sellShieldResult.ok).toBe(false);
    expect(sellShieldResult.rejectionReason).toContain("Trade limit reached");

    // 2. Upgrade reputation to Allied (+15)
    // Caps: maxTransactions = 10 + 15/5 = 13, maxGoldVolume = 500 + 15 * 20 = 800
    state.factionRep!["rangers"] = 15;
    const capsAllied = getMerchantTradeCaps(state, "rangers");
    expect(capsAllied.maxTransactions).toBe(13);
    expect(capsAllied.maxGoldVolume).toBe(800);

    // Expensive gem should now succeed perfectly!
    const buyGemAllied = step(state, { type: "BUY", item: "expensive_gem", npc: "merchant_npc" }, mockPack);
    expect(buyGemAllied.ok).toBe(true);
  });

  it("should propagate trade history, reputation alignments, and caps across the Gossip mesh and enforce converged limits", () => {
    const nodeA = new GossipNode("alice", mockPack, 42);
    const nodeB = new GossipNode("bob", mockPack, 42);

    nodeA.peers.set("bob", nodeB);
    nodeB.peers.set("alice", nodeA);

    // Deterministically stock the merchant using engine dialogue actions on Node A
    const resTalk = nodeA.executeLocalAction({ type: "TALK", npc: "merchant_npc" });
    expect(resTalk.ok).toBe(true);
    
    const resStock = nodeA.executeLocalAction({ type: "ASK", npc: "merchant_npc", topic: "ask_stock" });
    expect(resStock.ok).toBe(true);
    expect(nodeA.localState.merchantInventories?.["merchant_npc"]).toContain("wooden_shield");
    expect(nodeA.localState.merchantInventories?.["merchant_npc"]).toContain("expensive_gem");

    // Node A buys the wooden shield (1 trade executed locally on Node A)
    const resA = nodeA.executeLocalAction({
      type: "BUY",
      item: "wooden_shield",
      npc: "merchant_npc",
    });
    expect(resA.ok).toBe(true);
    // 2 stock history entries + 1 buy history entry = 3
    expect(nodeA.localState.tradeHistory?.length).toBe(3);

    // Bob has 0 trades locally
    expect(nodeB.localState.tradeHistory?.length).toBe(0);

    // Gossip from Alice to Bob
    nodeA.gossip();

    // Bob converges and now has the identical tradeHistory!
    expect(nodeB.localState.tradeHistory?.length).toBe(3);

    // Since Bob converged on the same transaction history, and rangers are hostile (cap = 1 transaction for buys/sells),
    // Bob should be blocked from executing a new trade locally due to the global cap!
    // The expensive gem is still in stock, so Bob's out-of-stock check passes, and hits the cap check!
    const resB = nodeB.executeLocalAction({
      type: "BUY",
      item: "expensive_gem",
      npc: "merchant_npc",
    });
    console.log("BOB BUY RESULT DETAILS:", JSON.stringify(resB));
    if (resB.ok) {
      console.log("BOB BUY SUCCEEDED UNEXPECTEDLY! Events:", JSON.stringify(resB.events));
    }
    expect(resB.ok).toBe(false);
    expect(resB.rejectionReason).toContain("Trade limit reached");
  });
});
