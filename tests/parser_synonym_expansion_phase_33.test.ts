import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion Phase 33 (Task-F70)", () => {
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
    expect(mapCommand("navigate one's course in the direction of the coordinates of east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("navigate one's course in the direction of the coordinates of the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("navigate ones course in the direction of the coordinates of east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("navigate ones course in the direction of the coordinates of the east", actions).action).toEqual({ type: "MOVE", direction: "east" });

    expect(mapCommand("steer one's journey towards the coordinates of east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("steer one's journey towards the coordinates of the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("steer ones journey towards the coordinates of east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("steer ones journey towards the coordinates of the east", actions).action).toEqual({ type: "MOVE", direction: "east" });

    expect(mapCommand("direct one's journey towards the location of east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("direct one's journey towards the location of the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("direct ones journey towards the location of east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("direct ones journey towards the location of the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
  });

  it("should map newly added inspection verbs to LOOK action", () => {
    expect(mapCommand("conduct a thorough visual examination on altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("conduct a thorough visual examination on the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });

    expect(mapCommand("carry out a detailed visual check on the details of altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("carry out a detailed visual check on the details of the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });

    expect(mapCommand("cast one's inquisitive eyes upon the details of altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast one's inquisitive eyes upon the details of the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast ones inquisitive eyes upon the details of altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast ones inquisitive eyes upon the details of the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
  });

  it("should map newly added take verbs to TAKE action", () => {
    expect(mapCommand("bring under one's immediate possession katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("bring under one's immediate possession the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("bring under ones immediate possession katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("bring under ones immediate possession the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });

    expect(mapCommand("take into one's absolute custody katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take into one's absolute custody the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take into ones absolute custody katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take into ones absolute custody the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });

    expect(mapCommand("assume direct physical possession of katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("assume direct physical possession of the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
  });

  it("should map newly added drop verbs to DROP action", () => {
    expect(mapCommand("divest oneself of the direct custody of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("divest oneself of the direct custody of the boots", actions).action).toEqual({ type: "DROP", item: "boots" });

    expect(mapCommand("let drop directly onto the earth surface boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("let drop directly onto the earth surface the boots", actions).action).toEqual({ type: "DROP", item: "boots" });

    expect(mapCommand("free oneself from the absolute custody of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("free oneself from the absolute custody of the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
  });

  it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
    expect(mapCommand("swing entirely and completely wide open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("swing entirely and completely wide open the vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("pry fully and completely wide open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("pry fully and completely wide open the vault", actions).action).toEqual({ type: "OPEN", target: "vault" });

    expect(mapCommand("latch entirely and securely closed door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("latch entirely and securely closed the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("seal entirely and securely closed door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("seal entirely and securely closed the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
  });

  it("should map newly added unlock verbs to UNLOCK action", () => {
    expect(mapCommand("deactivate all mechanical security systems on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("deactivate all mechanical security systems on the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("bypass all mechanical security systems of chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("bypass all mechanical security systems of the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("disengage the primary security lock mechanism on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("disengage the primary security lock mechanism on the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
  });

  it("should map newly added use verbs to USE action", () => {
    expect(mapCommand("harness the full mechanical capability of lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("harness the full mechanical capability of the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });

    expect(mapCommand("bring into active operational service lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("bring into active operational service the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });

    expect(mapCommand("make complete active use of lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("make complete active use of the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
  });

  it("should map newly added combat verbs to FIGHT action", () => {
    expect(mapCommand("wage direct physical combat against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("wage direct physical combat against the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });

    expect(mapCommand("commence active combat operations against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("commence active combat operations against the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });

    expect(mapCommand("initiate offensive physical warfare against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("initiate offensive physical warfare against the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
  });

  it("should map newly added dialogue verbs to TALK action", () => {
    expect(mapCommand("initiate a detailed verbal discussion with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("initiate a detailed verbal discussion with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });

    expect(mapCommand("engage in a detailed verbal conversation with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("engage in a detailed verbal conversation with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });

    expect(mapCommand("strike up a detailed verbal conversation with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("strike up a detailed verbal conversation with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
  });
});
