import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion (Cycle #68 / Task-F34)", () => {
  const actions = [
    { id: "craft-potion", command: "craft healing potion", action: { type: "USE" as const, item: "potion" } },
    { id: "combine-ore-coal", command: "combine iron ore with coal", action: { type: "USE" as const, item: "coal" } },
    {
      id: "ask-price-sword",
      command: "ask price of steel sword",
      action: { type: "ASK" as const, topic: "price", npc: "merchant" },
    },
    { id: "buy-shield", command: "buy shield from merchant", action: { type: "BUY" as const, item: "shield" } },
    { id: "sell-gem", command: "sell emerald gem to merchant", action: { type: "SELL" as const, item: "gem" } },
  ];

  it("should map newly added craft/combine verbs to USE action", () => {
    // Basic verbs
    expect(mapCommand("amalgamate healing potion", actions).action).toEqual({ type: "USE", item: "potion" });
    expect(mapCommand("integrate healing potion", actions).action).toEqual({ type: "USE", item: "potion" });
    expect(mapCommand("unify healing potion", actions).action).toEqual({ type: "USE", item: "potion" });
    expect(mapCommand("splice healing potion", actions).action).toEqual({ type: "USE", item: "potion" });

    // Compound verbs
    expect(mapCommand("craft healing potion with coal", actions).action).toEqual({ type: "USE", item: "potion" });
    expect(mapCommand("forge iron ore with coal", actions).action).toEqual({ type: "USE", item: "coal" });
    expect(mapCommand("couple iron ore with coal", actions).action).toEqual({ type: "USE", item: "coal" });
  });

  it("should map newly added pricing inquiry verbs and compound structures to ASK action", () => {
    expect(mapCommand("quote of steel sword", actions).action).toEqual({
      type: "ASK",
      topic: "price",
      npc: "merchant",
    });
    expect(mapCommand("check the price of steel sword", actions).action).toEqual({
      type: "ASK",
      topic: "price",
      npc: "merchant",
    });
    expect(mapCommand("what is the cost of the steel sword", actions).action).toEqual({
      type: "ASK",
      topic: "price",
      npc: "merchant",
    });
    expect(mapCommand("inquire about value of steel sword", actions).action).toEqual({
      type: "ASK",
      topic: "price",
      npc: "merchant",
    });
  });

  it("should map newly added trade transaction verbs and compounds to BUY/SELL actions", () => {
    expect(mapCommand("procure shield from merchant", actions).action).toEqual({ type: "BUY", item: "shield" });
    expect(mapCommand("purchase shield from the merchant", actions).action).toEqual({ type: "BUY", item: "shield" });
    expect(mapCommand("liquidate emerald gem to merchant", actions).action).toEqual({ type: "SELL", item: "gem" });
    expect(mapCommand("pawn emerald gem to the merchant", actions).action).toEqual({ type: "SELL", item: "gem" });
  });
});
