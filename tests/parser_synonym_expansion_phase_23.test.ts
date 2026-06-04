import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion Phase 23 (Task-F60)", () => {
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
    { id: "fight-ghoul", command: "fight crypt ghoul", action: { type: "FIGHT" as const, npc: "ghoul" } },
  ];

  it("should map newly added movement verbs to MOVE action", () => {
    expect(mapCommand("direct one's course towards east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("direct one's course towards the east", actions).action).toEqual({
      type: "MOVE",
      direction: "east",
    });
    expect(mapCommand("direct ones course towards east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("direct ones course towards the east", actions).action).toEqual({
      type: "MOVE",
      direction: "east",
    });
    expect(mapCommand("navigate a route towards east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("navigate a route towards the east", actions).action).toEqual({
      type: "MOVE",
      direction: "east",
    });
    expect(mapCommand("journey in the direction of east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("journey in the direction of the east", actions).action).toEqual({
      type: "MOVE",
      direction: "east",
    });
  });

  it("should map newly added inspection verbs to LOOK action", () => {
    expect(mapCommand("carry out an inspection of altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("carry out an inspection of the altar", actions).action).toEqual({
      type: "LOOK",
      target: "altar",
    });
    expect(mapCommand("cast a critical eye over altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast a critical eye over the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("perform a visual check on altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("perform a visual check on the altar", actions).action).toEqual({
      type: "LOOK",
      target: "altar",
    });
  });

  it("should map newly added take verbs to TAKE action", () => {
    expect(mapCommand("take under one's control katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take under one's control the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take under ones control katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take under ones control the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("bring under one's custody katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("bring under one's custody the katana", actions).action).toEqual({
      type: "TAKE",
      item: "katana",
    });
    expect(mapCommand("bring under ones custody katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("bring under ones custody the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("gather up into inventory katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("gather up into inventory the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
  });

  it("should map newly added drop verbs to DROP action", () => {
    expect(mapCommand("deposit upon the ground boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("deposit upon the ground the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("let fall to the earth boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("let fall to the earth the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("divest ones self of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("divest ones self of the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("divest one's self of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("divest one's self of the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("free one's self of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("free one's self of the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
  });

  it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
    expect(mapCommand("pry completely open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("pry completely open the vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("force completely closed door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("force completely closed the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("seal completely closed door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("seal completely closed the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
  });

  it("should map newly added unlock verbs to UNLOCK action", () => {
    expect(mapCommand("disengage the lock of chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("disengage the lock of the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("deactivate security systems on chest", actions).action).toEqual({
      type: "UNLOCK",
      target: "chest",
    });
    expect(mapCommand("deactivate security systems on the chest", actions).action).toEqual({
      type: "UNLOCK",
      target: "chest",
    });
    expect(mapCommand("bypass security systems on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("bypass security systems on the chest", actions).action).toEqual({
      type: "UNLOCK",
      target: "chest",
    });
  });

  it("should map newly added use verbs to USE action", () => {
    expect(mapCommand("harness the functionality of lockpick", actions).action).toEqual({
      type: "USE",
      target: "chest",
    });
    expect(mapCommand("harness the functionality of the lockpick", actions).action).toEqual({
      type: "USE",
      target: "chest",
    });
    expect(mapCommand("bring into active play lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("bring into active play the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("make use of the functions of lockpick", actions).action).toEqual({
      type: "USE",
      target: "chest",
    });
    expect(mapCommand("make use of the functions of the lockpick", actions).action).toEqual({
      type: "USE",
      target: "chest",
    });
  });

  it("should map newly added combat verbs to FIGHT action", () => {
    expect(mapCommand("wage warfare against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("wage warfare against the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("commence hostilities against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("commence hostilities against the ghoul", actions).action).toEqual({
      type: "FIGHT",
      npc: "ghoul",
    });
    expect(mapCommand("initiate an assault against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("initiate an assault against the ghoul", actions).action).toEqual({
      type: "FIGHT",
      npc: "ghoul",
    });
  });

  it("should map newly added dialogue verbs to TALK action", () => {
    expect(mapCommand("initiate communication with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("initiate communication with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("strike up communication with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("strike up communication with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("strike up a chat with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("strike up a chat with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
  });
});
