import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { calculateTradePrice } from "../src/core/economy.js";

describe("Faction Prestige and Alliance-based Merchant Trading (Task-F23)", () => {
  const testPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "prestige_trade_pack",
      title: "Prestige and Alliance Trade Pack",
      start_room: "market",
      vars_init: {
        gold: 1000,
      },
      flags_init: [],
    },
    rooms: [
      {
        id: "market",
        name: "Market Square",
        description: "A bustling plaza.",
        objects: [],
        npcs: ["merchant_bob"],
        exits: [],
      },
    ],
    objects: [
      {
        id: "common_potion",
        name: "common potion",
        aliases: ["potion"],
        description: "A healing brew.",
        takeable: true,
        cost: 100,
      },
      {
        id: "prestige_sword",
        name: "prestige sword",
        aliases: ["sword"],
        description: "A finely crafted sword.",
        takeable: true,
        cost: 200,
        required_prestige: 50,
      },
      {
        id: "alliance_shield",
        name: "alliance shield",
        aliases: ["shield"],
        description: "A heavy defensive shield.",
        takeable: true,
        cost: 150,
        required_alliance: true,
      },
    ],
    npcs: [
      {
        id: "merchant_bob",
        name: "Merchant Bob",
        description: "Bob sells rare wares.",
        faction: "merchant_faction",
        dialogue: {
          root: "root_node",
          nodes: [
            {
              id: "root_node",
              npc_text: "Browse my goods.",
              topics: [
                {
                  id: "goodbye",
                  prompt: "Goodbye",
                  end: true,
                },
              ],
            },
          ],
        },
      },
    ],
  });

  it("should calculate trade price correctly with positive faction reputation (discount)", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
      varsInit: testPack.meta.vars_init,
    });
    const npc = testPack.npcs.find((n) => n.id === "merchant_bob")!;
    const obj = testPack.objects.find((o) => o.id === "common_potion")!;

    state.factionRep = { merchant_faction: 40 };

    // Base cost is 100.
    // Prestige factor discount: max(0.7, 1.0 - 40 * 0.005) = 0.8
    // Dynamic price: 100 * 0.8 = 80 gold
    const buyPrice = calculateTradePrice(state, npc, obj, obj.cost, true);
    expect(buyPrice).toBe(80);

    // Premium factor bonus: min(1.3, 1.0 + 40 * 0.005) = 1.2
    // Dynamic payout: 100 * 1.2 = 120 gold
    const sellPrice = calculateTradePrice(state, npc, obj, obj.cost, false);
    expect(sellPrice).toBe(120);
  });

  it("should calculate trade price correctly with guild prestige (discount)", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
      varsInit: testPack.meta.vars_init,
    });
    const npc = testPack.npcs.find((n) => n.id === "merchant_bob")!;
    const obj = testPack.objects.find((o) => o.id === "common_potion")!;

    state.guildPrestige = { "player-merchant_faction": 60 };

    // Base cost is 100.
    // Prestige factor discount: max(0.7, 1.0 - 60 * 0.005) = 0.7
    // Dynamic price: 100 * 0.7 = 70 gold
    const buyPrice = calculateTradePrice(state, npc, obj, obj.cost, true);
    expect(buyPrice).toBe(70);
  });

  it("should calculate trade price correctly with negative faction reputation (penalty)", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
      varsInit: testPack.meta.vars_init,
    });
    const npc = testPack.npcs.find((n) => n.id === "merchant_bob")!;
    const obj = testPack.objects.find((o) => o.id === "common_potion")!;

    state.factionRep = { merchant_faction: -30 };

    // Base cost is 100.
    // Prestige factor penalty: min(1.5, 1.0 - (-30) * 0.01) = 1.3
    // Dynamic price: 100 * 1.3 = 130 gold
    const buyPrice = calculateTradePrice(state, npc, obj, obj.cost, true);
    expect(buyPrice).toBe(130);

    // Markdown penalty: max(0.5, 1.0 + (-30) * 0.01) = 0.7
    // Dynamic payout: 100 * 0.7 = 70 gold
    const sellPrice = calculateTradePrice(state, npc, obj, obj.cost, false);
    expect(sellPrice).toBe(70);
  });

  it("should apply alliance-based buy discounts and sell premiums", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
      varsInit: testPack.meta.vars_init,
    });
    const npc = testPack.npcs.find((n) => n.id === "merchant_bob")!;
    const obj = testPack.objects.find((o) => o.id === "common_potion")!;

    // Player in syndicate_a
    state.syndicates = {
      synd_a: {
        id: "synd_a",
        name: "Syndicate A",
        members: ["player"],
        dominance: 50,
        turfTaxRate: 1.0,
      },
    };
    state.alliances = {
      synd_a: {
        merchant_faction: "allied",
      },
    };

    // Buy discount: 15% off (multiplier *= 0.85) -> 100 * 0.85 = 85 gold
    const buyPrice = calculateTradePrice(state, npc, obj, obj.cost, true);
    expect(buyPrice).toBe(85);

    // Sell premium: 15% bonus (multiplier *= 1.15) -> 100 * 1.15 = 115 gold
    const sellPrice = calculateTradePrice(state, npc, obj, obj.cost, false);
    expect(sellPrice).toBe(115);
  });

  it("should restrict dynamic item buy actions based on prestige and alliance", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
      varsInit: testPack.meta.vars_init,
    });
    state.merchantInventories = {
      merchant_bob: ["common_potion", "prestige_sword", "alliance_shield"],
    };

    // 1. Try to buy prestige_sword with 0 prestige -> should reject
    const res1 = step(state, { type: "BUY", npc: "merchant_bob", item: "prestige_sword" }, testPack);
    expect(res1.ok).toBe(false);
    expect(res1.rejectionReason).toContain("faction prestige");

    // 2. Meet prestige requirement (50 prestige) -> should succeed
    state.factionRep = { merchant_faction: 50 };
    const res2 = step(state, { type: "BUY", npc: "merchant_bob", item: "prestige_sword" }, testPack);
    expect(res2.ok).toBe(true);

    // 3. Try to buy alliance_shield without alliance -> should reject
    const res3 = step(state, { type: "BUY", npc: "merchant_bob", item: "alliance_shield" }, testPack);
    expect(res3.ok).toBe(false);
    expect(res3.rejectionReason).toContain("exclusive to allied factions");

    // 4. Form alliance -> should succeed
    state.syndicates = {
      synd_a: {
        id: "synd_a",
        name: "Syndicate A",
        members: ["player"],
        dominance: 50,
        turfTaxRate: 1.0,
      },
    };
    state.alliances = {
      synd_a: {
        merchant_faction: "allied",
      },
    };
    const res4 = step(state, { type: "BUY", npc: "merchant_bob", item: "alliance_shield" }, testPack);
    expect(res4.ok).toBe(true);
  });
});
