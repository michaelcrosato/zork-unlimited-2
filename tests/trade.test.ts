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
