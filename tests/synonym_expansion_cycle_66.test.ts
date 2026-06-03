import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion (Cycle #66 / Task-F32)", () => {
  const actions = [
    { id: "move-east", command: "go east", action: { type: "MOVE" as const, direction: "east" } },
    { id: "look-altar", command: "look altar", action: { type: "LOOK" as const, target: "altar" } },
    { id: "take-katana", command: "take steel katana", action: { type: "TAKE" as const, item: "katana" } },
    { id: "drop-boots", command: "drop leather boots", action: { type: "DROP" as const, item: "boots" } },
    { id: "open-vault", command: "open iron vault", action: { type: "OPEN" as const, target: "vault" } },
    { id: "close-vault", command: "close iron vault", action: { type: "CLOSE" as const, target: "vault" } },
    {
      id: "unlock-chest",
      command: "unlock massive chest with gold key",
      action: { type: "UNLOCK" as const, target: "chest" },
    },
    { id: "use-amulet", command: "use golden amulet", action: { type: "USE" as const, item: "amulet" } },
    { id: "talk-capo", command: "talk to smuggler capo", action: { type: "TALK" as const, npc: "capo" } },
    {
      id: "ask-capo-contracts",
      command: "ask capo about contracts",
      action: { type: "ASK" as const, npc: "capo", topic: "contracts" },
    },
    { id: "give-biscuit", command: "give dry biscuit to capo", action: { type: "GIVE" as const, target: "capo" } },
    { id: "fight-ghoul", command: "fight crypt ghoul", action: { type: "FIGHT" as const, npc: "ghoul" } },
    {
      id: "cast-lightning",
      command: "cast lightning on ghoul",
      action: { type: "CAST" as const, spell: "lightning", target: "ghoul" },
    },
    { id: "flee-combat", command: "flee combat", action: { type: "FLEE" as const } },
    {
      id: "buy-bread",
      command: "buy travelbread from merchant",
      action: { type: "BUY" as const, item: "travelbread" },
    },
    {
      id: "sell-potion",
      command: "sell manapotion to merchant",
      action: { type: "SELL" as const, item: "manapotion" },
    },
    { id: "check-inv", command: "inventory", action: { type: "INVENTORY" as const } },
  ];

  it("should map newly added MOVE verbs to MOVE action", () => {
    expect(mapCommand("navigate east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("meander east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("trek east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("sprint to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
  });

  it("should map newly added LOOK_INSPECT verbs to LOOK action", () => {
    expect(mapCommand("analyze altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("investigate altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("audit altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
  });

  it("should map newly added TAKE verbs and sword synonyms to TAKE action", () => {
    expect(mapCommand("secure katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("seize blade", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("purloin weapon", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("commandeer cutlass", actions).action).toEqual({ type: "TAKE", item: "katana" });
  });

  it("should map newly added DROP verbs and boot synonyms to DROP action", () => {
    expect(mapCommand("relinquish boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("shed footwear", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("jettison sabatons", actions).action).toEqual({ type: "DROP", item: "boots" });
  });

  it("should map newly added OPEN and CLOSE verbs/chest synonyms to appropriate actions", () => {
    expect(mapCommand("unseal vaults", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("swing open lockers", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("slam lockbox", actions).action).toEqual({ type: "CLOSE", target: "vault" });
    expect(mapCommand("fasten bin", actions).action).toEqual({ type: "CLOSE", target: "vault" });
  });

  it("should map newly added UNLOCK verbs to UNLOCK action", () => {
    expect(mapCommand("unbolt chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("bypass lock chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
  });

  it("should map newly added USE verbs and jewelry/amulet synonyms to USE action", () => {
    expect(mapCommand("activate amulet", actions).action).toEqual({ type: "USE", item: "amulet" });
    expect(mapCommand("utilize ring", actions).action).toEqual({ type: "USE", item: "amulet" });
    expect(mapCommand("deploy necklace", actions).action).toEqual({ type: "USE", item: "amulet" });
    expect(mapCommand("operate talisman", actions).action).toEqual({ type: "USE", item: "amulet" });
  });

  it("should map newly added TALK and ASK verbs to TALK/ASK actions", () => {
    expect(mapCommand("accost capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("converse with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("interrogate capo", actions).action).toEqual({ type: "ASK", npc: "capo", topic: "contracts" });
  });

  it("should map newly added GIVE verbs and food synonyms to GIVE action", () => {
    expect(mapCommand("donate biscuit to capo", actions).action).toEqual({ type: "GIVE", target: "capo" });
    expect(mapCommand("present hardtack to capo", actions).action).toEqual({ type: "GIVE", target: "capo" });
    expect(mapCommand("deliver ration to capo", actions).action).toEqual({ type: "GIVE", target: "capo" });
  });

  it("should map newly added FIGHT and CAST verbs to FIGHT/CAST actions", () => {
    expect(mapCommand("duel ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("assassinate ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("summon bolt on ghoul", actions).action).toEqual({
      type: "CAST",
      spell: "lightning",
      target: "ghoul",
    });
    expect(mapCommand("blast current on ghoul", actions).action).toEqual({
      type: "CAST",
      spell: "lightning",
      target: "ghoul",
    });
  });

  it("should map newly added FLEE verbs to FLEE action", () => {
    expect(mapCommand("skedaddle", actions).action).toEqual({ type: "FLEE" });
    expect(mapCommand("abscond", actions).action).toEqual({ type: "FLEE" });
  });

  it("should map newly added BUY and SELL verbs alongside food/potion synonyms", () => {
    expect(mapCommand("purchase pemmican", actions).action).toEqual({ type: "BUY", item: "travelbread" });
    expect(mapCommand("liquidate reagent", actions).action).toEqual({ type: "SELL", item: "manapotion" });
  });

  it("should map newly added INVENTORY verbs", () => {
    expect(mapCommand("gear", actions).action).toEqual({ type: "INVENTORY" });
    expect(mapCommand("belongings", actions).action).toEqual({ type: "INVENTORY" });
  });
});
