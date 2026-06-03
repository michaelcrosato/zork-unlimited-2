import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion Phase 29 (Task-F66)", () => {
  const actions = [
    { id: "move-east", command: "go east", action: { type: "MOVE" as const, direction: "east" } },
    { id: "look-altar", command: "look altar", action: { type: "LOOK" as const, target: "altar" } },
    { id: "take-katana", command: "take steel katana", action: { type: "TAKE" as const, item: "katana" } },
    { id: "drop-boots", command: "drop leather boots", action: { type: "DROP" as const, item: "boots" } },
    { id: "talk-capo", command: "talk to smuggler capo", action: { type: "TALK" as const, npc: "capo" } },
    { id: "use-lockpick", command: "use lockpick on chest", action: { type: "USE" as const, target: "chest" } },
    { id: "unlock-chest", command: "unlock chest with key", action: { type: "UNLOCK" as const, target: "chest" } },
    { id: "open-vault", command: "open iron vault", action: { type: "OPEN" as const, target: "vault" } },
    { id: "close-door", command: "close heavy door", action: { type: "CLOSE" as const, target: "door" } },
    { id: "fight-ghoul", command: "fight crypt ghoul", action: { type: "FIGHT" as const, npc: "ghoul" } }
  ];

  it("should map newly added movement verbs to MOVE action", () => {
    expect(mapCommand("steer one's journey towards east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("steer one's journey towards the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("steer ones journey towards east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("steer ones journey towards the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("navigate one's steps towards east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("navigate one's steps towards the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("navigate ones steps towards east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("navigate ones steps towards the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("direct one's path in the direction of east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("direct one's path in the direction of the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("direct ones path in the direction of east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("direct ones path in the direction of the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
  });

  it("should map newly added inspection verbs to LOOK action", () => {
    expect(mapCommand("carry out a visual check of altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("carry out a visual check of the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("conduct a thorough investigation on altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("conduct a thorough investigation on the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast one's inquisitive eyes upon altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast one's inquisitive eyes upon the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast ones inquisitive eyes upon altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast ones inquisitive eyes upon the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
  });

  it("should map newly added take verbs to TAKE action", () => {
    expect(mapCommand("bring under one's personal control katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("bring under one's personal control the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("bring under ones personal control katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("bring under ones personal control the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take into one's permanent custody katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take into one's permanent custody the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take into ones permanent custody katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take into ones permanent custody the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("assume absolute possession of katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("assume absolute possession of the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
  });

  it("should map newly added drop verbs to DROP action", () => {
    expect(mapCommand("divest oneself of the personal custody of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("divest oneself of the personal custody of the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("let drop directly to the ground boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("let drop directly to the ground the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("free oneself from the physical possession of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("free oneself from the physical possession of the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
  });

  it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
    expect(mapCommand("force entirely wide open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("force entirely wide open the vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("pry entirely wide open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("pry entirely wide open the vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("latch entirely shut door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("latch entirely shut the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("seal completely shut door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("seal completely shut the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
  });

  it("should map newly added unlock verbs to UNLOCK action", () => {
    expect(mapCommand("deactivate all security lock mechanisms on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("deactivate all security lock mechanisms on the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("bypass all security lock mechanisms of chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("bypass all security lock mechanisms of the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("disengage the locking mechanism on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("disengage the locking mechanism on the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
  });

  it("should map newly added use verbs to USE action", () => {
    expect(mapCommand("harness the practical functions of lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("harness the practical functions of the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("bring into immediate operational service lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("bring into immediate operational service the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("make complete practical use of lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("make complete practical use of the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
  });

  it("should map newly added combat verbs to FIGHT action", () => {
    expect(mapCommand("wage direct hostilities against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("wage direct hostilities against the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("commence physical combat against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("commence physical combat against the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("initiate active combat operations against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("initiate active combat operations against the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
  });

  it("should map newly added dialogue verbs to TALK action", () => {
    expect(mapCommand("initiate a personal conversation with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("initiate a personal conversation with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("engage in a personal dialogue with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("engage in a personal dialogue with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("strike up a personal conversation with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("strike up a personal conversation with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
  });
});
