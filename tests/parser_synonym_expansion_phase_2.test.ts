import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion Phase 2 (Task-F36)", () => {
  const actions = [
    { id: "move-east", command: "go east", action: { type: "MOVE" as const, direction: "east" } },
    { id: "look-altar", command: "look altar", action: { type: "LOOK" as const, target: "altar" } },
    { id: "take-katana", command: "take steel katana", action: { type: "TAKE" as const, item: "katana" } },
    { id: "drop-boots", command: "drop leather boots", action: { type: "DROP" as const, item: "boots" } },
    {
      id: "dialogue_prestige",
      command: "ask about check your prestige",
      action: { type: "ASK" as const, npc: "npc", topic: "check_prestige" },
    },
    { id: "talk-capo", command: "talk to smuggler capo", action: { type: "TALK" as const, npc: "capo" } },
    { id: "fight-ghoul", command: "fight crypt ghoul", action: { type: "FIGHT" as const, npc: "ghoul" } },
    {
      id: "buy-bread",
      command: "buy travelbread from merchant",
      action: { type: "BUY" as const, item: "travelbread" },
    },
    {
      id: "sell-bread",
      command: "sell travelbread to merchant",
      action: { type: "SELL" as const, item: "travelbread" },
    },
    {
      id: "sell-potion",
      command: "sell manapotion to merchant",
      action: { type: "SELL" as const, item: "manapotion" },
    },
    { id: "check-inv", command: "inventory", action: { type: "INVENTORY" as const } },
  ];

  it("should map newly added combat verbs to FIGHT action", () => {
    expect(mapCommand("smite ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("vanquish ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("execute ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("cleave ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("pulverize ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("subdue ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("decimate ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("annihilate ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("maul ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("bludgeon ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("slaughter ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("ambush ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("backstab ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
  });

  it("should map complex combat compound verbs to FIGHT action", () => {
    expect(mapCommand("initiate combat with ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("initiate battle with the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("engage in combat with ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("engage in battle with the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("engage in a fight with ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("engage in a brawl with the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("engage in a skirmish with ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("strike a blow against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("strike a blow against the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("deliver a blow to ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("deliver a blow to the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("lay waste to the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("finish off ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("do battle with the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("wage war against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("ambush the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("backstab the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("strike down the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("beat down the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
  });

  it("should map newly added trade compound verbs to BUY and SELL actions", () => {
    expect(mapCommand("exchange travelbread for gold", actions).action).toEqual({ type: "SELL", item: "travelbread" });
    expect(mapCommand("exchange the travelbread for coins", actions).action).toEqual({
      type: "SELL",
      item: "travelbread",
    });
    expect(mapCommand("buy the travelbread from the merchant", actions).action).toEqual({
      type: "BUY",
      item: "travelbread",
    });
    expect(mapCommand("purchase travelbread from merchant", actions).action).toEqual({
      type: "BUY",
      item: "travelbread",
    });
    expect(mapCommand("transact travelbread from merchant", actions).action).toEqual({
      type: "BUY",
      item: "travelbread",
    });

    expect(mapCommand("sell the manapotion to the merchant", actions).action).toEqual({
      type: "SELL",
      item: "manapotion",
    });
    expect(mapCommand("pawn manapotion to merchant", actions).action).toEqual({ type: "SELL", item: "manapotion" });
    expect(mapCommand("cash in manapotion", actions).action).toEqual({ type: "SELL", item: "manapotion" });
    expect(mapCommand("convert to cash manapotion", actions).action).toEqual({ type: "SELL", item: "manapotion" });
  });

  it("should map faction-related reputation queries to check_prestige ASK action", () => {
    expect(mapCommand("check reputation", actions).action).toEqual({
      type: "ASK",
      npc: "npc",
      topic: "check_prestige",
    });
    expect(mapCommand("show reputation", actions).action).toEqual({
      type: "ASK",
      npc: "npc",
      topic: "check_prestige",
    });
    expect(mapCommand("view reputation", actions).action).toEqual({
      type: "ASK",
      npc: "npc",
      topic: "check_prestige",
    });
    expect(mapCommand("check prestige", actions).action).toEqual({
      type: "ASK",
      npc: "npc",
      topic: "check_prestige",
    });
    expect(mapCommand("show prestige", actions).action).toEqual({
      type: "ASK",
      npc: "npc",
      topic: "check_prestige",
    });
    expect(mapCommand("view prestige", actions).action).toEqual({
      type: "ASK",
      npc: "npc",
      topic: "check_prestige",
    });
    expect(mapCommand("check standing", actions).action).toEqual({
      type: "ASK",
      npc: "npc",
      topic: "check_prestige",
    });
    expect(mapCommand("show standing", actions).action).toEqual({
      type: "ASK",
      npc: "npc",
      topic: "check_prestige",
    });
    expect(mapCommand("view standing", actions).action).toEqual({
      type: "ASK",
      npc: "npc",
      topic: "check_prestige",
    });
    expect(mapCommand("check status", actions).action).toEqual({
      type: "ASK",
      npc: "npc",
      topic: "check_prestige",
    });
    expect(mapCommand("show status", actions).action).toEqual({
      type: "ASK",
      npc: "npc",
      topic: "check_prestige",
    });
    expect(mapCommand("view status", actions).action).toEqual({
      type: "ASK",
      npc: "npc",
      topic: "check_prestige",
    });
    expect(mapCommand("check loyalty", actions).action).toEqual({
      type: "ASK",
      npc: "npc",
      topic: "check_prestige",
    });
    expect(mapCommand("show loyalty", actions).action).toEqual({
      type: "ASK",
      npc: "npc",
      topic: "check_prestige",
    });
    expect(mapCommand("view loyalty", actions).action).toEqual({
      type: "ASK",
      npc: "npc",
      topic: "check_prestige",
    });
    expect(mapCommand("check alliances", actions).action).toEqual({
      type: "ASK",
      npc: "npc",
      topic: "check_prestige",
    });
    expect(mapCommand("check alliance", actions).action).toEqual({
      type: "ASK",
      npc: "npc",
      topic: "check_prestige",
    });
    expect(mapCommand("show alliances", actions).action).toEqual({
      type: "ASK",
      npc: "npc",
      topic: "check_prestige",
    });
    expect(mapCommand("view alliances", actions).action).toEqual({
      type: "ASK",
      npc: "npc",
      topic: "check_prestige",
    });
    expect(mapCommand("check rep", actions).action).toEqual({
      type: "ASK",
      npc: "npc",
      topic: "check_prestige",
    });
  });
});
