import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { buildObservation } from "../src/api/observation.js";
import { Action, ParserObservation } from "../src/api/types.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { validateParserPack } from "../src/validate/parser_validator.js";
import { generateLegalActions } from "../src/parser/legal_actions.js";

describe("Procedural Merchant and Trading System (NPC_TRADE)", () => {
  const tradePack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "trade_test_pack",
      title: "Trade and Economy Test",
      start_room: "market",
      vars_init: {
        gold: 20, // Start with 20 gold
      },
      flags_init: [],
    },
    rooms: [
      {
        id: "market",
        name: "Market Square",
        description: "A bustling market with merchants.",
        objects: [],
        npcs: ["merchant_bob"],
        exits: [],
      },
    ],
    objects: [
      {
        id: "iron_sword",
        name: "iron sword",
        aliases: ["sword"],
        description: "A sharp blade made of iron.",
        takeable: true,
        cost: 15,
      },
      {
        id: "wooden_shield",
        name: "wooden shield",
        aliases: ["shield"],
        description: "A simple wooden shield.",
        takeable: true,
        cost: 6,
      },
      {
        id: "royal_gem",
        name: "royal gem",
        aliases: ["gem"],
        description: "A priceless gem.",
        takeable: true,
        quest_critical: true,
        cost: 100,
      },
    ],
    npcs: [
      {
        id: "merchant_bob",
        name: "Merchant Bob",
        description: "He sells rare weaponry.",
        dialogue: {
          root: "root_node",
          nodes: [
            {
              id: "root_node",
              npc_text: "Welcome to my shop! Would you like to trade?",
              topics: [
                {
                  id: "ask_stock",
                  prompt: "Stock the shop",
                  goto: "root_node",
                  effects: [
                    {
                      npc_trade: {
                        npc_id: "merchant_bob",
                        action: "stock",
                        possible_items: ["iron_sword"],
                        success_msg: "Bob stocks an iron sword.",
                      },
                    },
                  ],
                },
                {
                  id: "goodbye",
                  prompt: "Goodbye",
                  end: true,
                },
                {
                  id: "complete_quest",
                  prompt: "Finish the adventure",
                  goto: "root_node",
                  conditions: [
                    { has_item: "iron_sword" },
                  ],
                  effects: [
                    { set_flag: "game_completed" },
                  ],
                },
              ],
            },
          ],
        },
      },
    ],
    win_conditions: [
      {
        id: "has_sword",
        conditions: [
          { has_item: "iron_sword" },
          { has_flag: "game_completed" },
        ],
        ending: "ending_victory",
      },
    ],
    endings: [
      {
        id: "ending_victory",
        title: "Well Armed",
        text: "You successfully purchased the iron sword!",
      },
    ],
  });

  it("should validate the trade pack without errors", () => {
    const report = validateParserPack(tradePack);
    console.log("VALIDATION FINDINGS FOR TRADE PACK:", JSON.stringify(report.findings, null, 2));
    expect(report.ok).toBe(true);
  });

  it("should successfully stock, buy, and sell items deterministically", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
      varsInit: tradePack.meta.vars_init,
      flagsInit: tradePack.meta.flags_init,
    });

    // 1. Initially, merchant should not have initialized stock until stocked
    expect(state.merchantInventories?.["merchant_bob"]).toBeUndefined();
    expect(state.vars["gold"]).toBe(20);

    // 2. Stock the merchant with an iron sword via dialogue effect
    const talkResult = step(state, { type: "TALK", npc: "merchant_bob" }, tradePack);
    expect(talkResult.ok).toBe(true);
    state = talkResult.state;

    const stockResult = step(state, { type: "ASK", npc: "merchant_bob", topic: "ask_stock" }, tradePack);
    expect(stockResult.ok).toBe(true);
    state = stockResult.state;

    // Check that merchant now stocks the iron sword (procedurally selected from possible_items)
    expect(state.merchantInventories?.["merchant_bob"]).toContain("iron_sword");
    expect(state.tradeHistory).toHaveLength(1);
    expect(state.tradeHistory?.[0]).toMatchObject({
      npcId: "merchant_bob",
      action: "stock",
      item: "iron_sword",
    });

    // Exit dialogue to resume normal commands
    const exitDialogueResult = step(state, { type: "ASK", npc: "merchant_bob", topic: "goodbye" }, tradePack);
    expect(exitDialogueResult.ok).toBe(true);
    state = exitDialogueResult.state;
    expect(state.flags["in_dialogue_with_merchant_bob"]).toBe(false);

    // 3. Generate legal actions and assert 'buy iron sword from merchant bob' is available
    const legalActions = generateLegalActions(state, tradePack);
    const buyAction = legalActions.find((a) => a.action.type === "BUY" && a.action.item === "iron_sword");
    expect(buyAction).toBeDefined();
    expect(buyAction?.command).toBe("buy iron sword from merchant bob");

    // 4. Try to buy without enough gold (temporarily reduce player gold to 5)
    let lowGoldState = {
      ...state,
      vars: { ...state.vars, gold: 5 },
    };
    const failedBuyResult = step(lowGoldState, { type: "BUY", item: "iron_sword", npc: "merchant_bob" }, tradePack);
    expect(failedBuyResult.ok).toBe(false); // fails due to insufficient gold

    // 5. Buy iron sword with enough gold
    const buyResult = step(state, { type: "BUY", item: "iron_sword", npc: "merchant_bob" }, tradePack);
    expect(buyResult.ok).toBe(true);
    state = buyResult.state;

    expect(state.vars["gold"]).toBe(5); // 20 - 15 = 5
    expect(state.inventory).toContain("iron_sword");
    expect(state.merchantInventories?.["merchant_bob"]).not.toContain("iron_sword");
    expect(state.tradeHistory).toHaveLength(2);
    expect(state.tradeHistory?.[1]).toMatchObject({
      npcId: "merchant_bob",
      action: "buy",
      item: "iron_sword",
      gold: 15,
    });

    // 6. Sell a wooden shield (give the player a wooden shield first)
    state.inventory.push("wooden_shield");
    const sellActions = generateLegalActions(state, tradePack);
    const sellShield = sellActions.find((a) => a.action.type === "SELL" && a.action.item === "wooden_shield");
    expect(sellShield).toBeDefined();
    expect(sellShield?.command).toBe("sell wooden shield to merchant bob");

    const sellResult = step(state, { type: "SELL", item: "wooden_shield", npc: "merchant_bob" }, tradePack);
    if (!sellResult.ok) {
      console.log("SELL RESULT FAILED:", JSON.stringify(sellResult, null, 2));
    }
    expect(sellResult.ok).toBe(true);
    state = sellResult.state;

    expect(state.vars["gold"]).toBe(11); // 5 + 6 = 11
    expect(state.inventory).not.toContain("wooden_shield");
    expect(state.merchantInventories?.["merchant_bob"]).toContain("wooden_shield");
    expect(state.tradeHistory?.[2]).toMatchObject({
      npcId: "merchant_bob",
      action: "sell",
      item: "wooden_shield",
      gold: 6,
    });

    // 7. Try to sell a quest critical item (royal gem)
    state.inventory.push("royal_gem");
    const sellActions2 = generateLegalActions(state, tradePack);
    const sellGem = sellActions2.find((a) => a.action.type === "SELL" && a.action.item === "royal_gem");
    expect(sellGem).toBeUndefined(); // Should not be generated as a legal action since it is quest critical

    const sellGemResult = step(state, { type: "SELL", item: "royal_gem", npc: "merchant_bob" }, tradePack);
    expect(sellGemResult.ok).toBe(false); // fails due to quest critical block

    // 8. Now talk to the merchant and complete the quest to end the game
    const talkResult2 = step(state, { type: "TALK", npc: "merchant_bob" }, tradePack);
    expect(talkResult2.ok).toBe(true);
    state = talkResult2.state;

    const winResult = step(state, { type: "ASK", npc: "merchant_bob", topic: "complete_quest" }, tradePack);
    expect(winResult.ok).toBe(true);
    state = winResult.state;
    expect(state.ended).toBe(true);
    expect(state.endingId).toBe("ending_victory");
  });
});

describe("Cycle 26 Economy Enhancements (AF-26)", () => {
  const econPack = ParserPackSchema.parse({
    meta: {
      id: "econ_test_pack",
      title: "Enhanced Economy Test",
      start_room: "shop",
      vars_init: {
        gold: 100,
      },
      flags_init: [],
    },
    rooms: [
      {
        id: "shop",
        name: "Shop Room",
        description: "A cozy shop.",
        objects: [],
        npcs: ["merchant_tim"],
        exits: [],
      },
    ],
    objects: [
      {
        id: "winter_coat",
        name: "winter coat",
        description: "Keeps you warm.",
        takeable: true,
        cost: 20,
        climate_pricing: {
          storm: 2.0,
        },
      },
      {
        id: "rusty_sword",
        name: "rusty sword",
        description: "A rusty sword.",
        takeable: true,
        cost: 10,
      },
    ],
    npcs: [
      {
        id: "merchant_tim",
        name: "Merchant Tim",
        description: "Tim the merchant.",
        gold: 50,
        gold_limit: 80,
        restock_interval: 3,
        possible_items: ["rusty_sword"],
        climate_pricing: {
          storm: 1.5,
        },
        min_rep: -5,
        dialogue: {
          root: "root_node",
          nodes: [
            {
              id: "root_node",
              npc_text: "Hello!",
              topics: [
                {
                  id: "help_rep",
                  prompt: "Do a good deed",
                  goto: "root_node",
                  effects: [
                    {
                      change_reputation: {
                        npc_id: "merchant_tim",
                        by: 5,
                      },
                    },
                  ],
                },
                {
                  id: "gossip_bad",
                  prompt: "Insult him",
                  goto: "root_node",
                  effects: [
                    {
                      change_reputation: {
                        npc_id: "merchant_tim",
                        by: -10,
                      },
                    },
                  ],
                },
                {
                  id: "trade_rep_gated",
                  prompt: "Secret Trade",
                  goto: "root_node",
                  effects: [
                    {
                      npc_trade: {
                        npc_id: "merchant_tim",
                        action: "buy",
                        item: "rusty_sword",
                        cost: 10,
                        min_rep: 5,
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

  it("should apply weather climate_pricing and reputation pricing scales", () => {
    let state = createInitialState({
      seed: 42,
      start: "shop",
      varsInit: econPack.meta.vars_init,
    });

    // Stock the merchant first
    state.merchantInventories = {
      merchant_tim: ["winter_coat"],
    };

    // Under default weather (clear), base price is 20 gold
    // Let's buy and check that it generates BUY option at 20 gold
    const buyRes1 = step(state, { type: "BUY", item: "winter_coat", npc: "merchant_tim" }, econPack);
    expect(buyRes1.ok).toBe(true);
    expect(buyRes1.state.vars["gold"]).toBe(80); // 100 - 20 = 80
    expect(buyRes1.state.merchantGold?.["merchant_tim"]).toBe(70); // Merchant starts with 50 + 20 = 70

    // Reset state and test with storm weather
    let stormState = createInitialState({
      seed: 42,
      start: "shop",
      varsInit: econPack.meta.vars_init,
    });
    stormState.merchantInventories = {
      merchant_tim: ["winter_coat"],
    };
    stormState.environment = {
      weather: "storm",
      temperature: "cold",
      lastUpdatedStep: 0,
    };

    // Under storm weather:
    // Merchant Tim has storm pricing multiplier 1.5x
    // Winter Coat has storm pricing multiplier 2.0x
    // Combined multiplier: 1.5 * 2.0 = 3.0x
    // Winter Coat cost: 20 * 3.0 = 60 gold
    const buyRes2 = step(stormState, { type: "BUY", item: "winter_coat", npc: "merchant_tim" }, econPack);
    expect(buyRes2.ok).toBe(true);
    expect(buyRes2.state.vars["gold"]).toBe(40); // 100 - 60 = 40
    expect(buyRes2.state.merchantGold?.["merchant_tim"]).toBe(80); // 50 + 60 = 110, capped at gold_limit of 80!

    // Reset and test reputation pricing scale
    let repState = createInitialState({
      seed: 42,
      start: "shop",
      varsInit: econPack.meta.vars_init,
    });
    repState.merchantInventories = {
      merchant_tim: ["winter_coat"],
    };
    // Let's increase reputation to 5
    repState.npcRep = {
      merchant_tim: 5,
    };

    // With rep 5, we get a 10% discount: 1.0 - (5 * 0.02) = 0.9x
    // Cost: 20 * 0.9 = 18 gold
    const buyRes3 = step(repState, { type: "BUY", item: "winter_coat", npc: "merchant_tim" }, econPack);
    expect(buyRes3.ok).toBe(true);
    expect(buyRes3.state.vars["gold"]).toBe(82); // 100 - 18 = 82
  });

  it("should enforce merchant gold limits during selling", () => {
    let state = createInitialState({
      seed: 42,
      start: "shop",
      varsInit: econPack.meta.vars_init,
    });

    // Give player a winter_coat
    state.inventory.push("winter_coat");
    
    // Merchant Tim starts with 50 gold in the pack
    // Let's try to sell a custom expensive item (worth 60 gold)
    // We modify cost of winter_coat temporarily to 60
    const expensivePack = JSON.parse(JSON.stringify(econPack));
    expensivePack.objects[0].cost = 60;

    const sellRes1 = step(state, { type: "SELL", item: "winter_coat", npc: "merchant_tim" }, expensivePack);
    expect(sellRes1.ok).toBe(false); // fails because merchant cannot afford 60 gold (only has 50)

    // Now sell it at normal price (20 gold)
    const sellRes2 = step(state, { type: "SELL", item: "winter_coat", npc: "merchant_tim" }, econPack);
    expect(sellRes2.ok).toBe(true);
    expect(sellRes2.state.vars["gold"]).toBe(120); // 100 + 20
    expect(sellRes2.state.merchantGold?.["merchant_tim"]).toBe(30); // 50 - 20 = 30 gold left
  });

  it("should enforce minimum reputation gated checks", () => {
    let state = createInitialState({
      seed: 42,
      start: "shop",
      varsInit: econPack.meta.vars_init,
    });
    
    state.merchantInventories = {
      merchant_tim: ["winter_coat"],
    };

    // 1. Talk and insult Merchant Tim to drop reputation by -10 (reputation becomes -10)
    let talkRes = step(state, { type: "TALK", npc: "merchant_tim" }, econPack);
    expect(talkRes.ok).toBe(true);
    
    let insultRes = step(talkRes.state, { type: "ASK", npc: "merchant_tim", topic: "gossip_bad" }, econPack);
    expect(insultRes.ok).toBe(true);
    expect(insultRes.state.npcRep?.["merchant_tim"]).toBe(-10);

    // End dialogue to resume normal room commands
    let outOfDialogueState = {
      ...insultRes.state,
      flags: { ...insultRes.state.flags, in_dialogue_with_merchant_tim: false }
    };
    
    // Attempting to buy when reputation (-10) is below Merchant Tim's min_rep (-5) should fail!
    const buyFailed = step(outOfDialogueState, { type: "BUY", item: "winter_coat", npc: "merchant_tim" }, econPack);
    expect(buyFailed.ok).toBe(false);
    expect(buyFailed.rejectionReason).toContain("reputation");

    // 2. Secret trade requires reputation of 5
    let friendlyState = createInitialState({
      seed: 42,
      start: "shop",
      varsInit: econPack.meta.vars_init,
    });
    // Add rusty_sword to merchant's stock
    friendlyState.merchantInventories = {
      merchant_tim: ["rusty_sword"],
    };

    // Try to trigger secret trade dialogue effect with 0 reputation (fails min_rep: 5)
    let talkRes2 = step(friendlyState, { type: "TALK", npc: "merchant_tim" }, econPack);
    let secretTradeRes1 = step(talkRes2.state, { type: "ASK", npc: "merchant_tim", topic: "trade_rep_gated" }, econPack);
    expect(secretTradeRes1.ok).toBe(true);
    expect(secretTradeRes1.state.inventory).not.toContain("rusty_sword"); // Trade was rejected internally in effect

    // Now increase reputation to 5 and try again
    let highRepState = friendlyState;
    highRepState.npcRep = {
      merchant_tim: 5,
    };
    let talkRes3 = step(highRepState, { type: "TALK", npc: "merchant_tim" }, econPack);
    let secretTradeRes2 = step(talkRes3.state, { type: "ASK", npc: "merchant_tim", topic: "trade_rep_gated" }, econPack);
    expect(secretTradeRes2.ok).toBe(true);
    expect(secretTradeRes2.state.inventory).toContain("rusty_sword"); // Succeeded!
  });

  it("should trigger automatic daily restocking timers and procedurally stock items", () => {
    let state = createInitialState({
      seed: 12345, // Use fixed seed for deterministic choice
      start: "shop",
      varsInit: econPack.meta.vars_init,
    });

    // Make a few mock LOOK steps to advance the step counter
    // Restock interval is 3 steps
    expect(state.step).toBe(0);
    expect(state.merchantInventories?.["merchant_tim"]).toBeUndefined();

    // Step 1
    state = step(state, { type: "LOOK" }, econPack).state;
    expect(state.step).toBe(1);
    expect(state.merchantInventories?.["merchant_tim"]).toBeUndefined();

    // Step 2
    state = step(state, { type: "LOOK" }, econPack).state;
    expect(state.step).toBe(2);
    expect(state.merchantInventories?.["merchant_tim"]).toBeUndefined();

    // Step 3 -> Restock should trigger!
    // Since possible_items is ["rusty_sword"], it must stock rusty_sword
    state = step(state, { type: "LOOK" }, econPack).state;
    expect(state.step).toBe(3);
    expect(state.merchantInventories?.["merchant_tim"]).toContain("rusty_sword");
    expect(state.merchantGold?.["merchant_tim"]).toBe(50); // reset to starting gold
  });
});
