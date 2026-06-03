import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion Phase 25 (Task-F62)", () => {
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
    expect(mapCommand("steer one's course in the direction of east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("steer one's course in the direction of the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("steer ones course in the direction of east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("steer ones course in the direction of the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("journey towards the coordinates of east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("journey towards the coordinates of the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("navigate a course towards east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("navigate a course towards the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
  });

  it("should map newly added inspection verbs to LOOK action", () => {
    expect(mapCommand("carry out a visual check on altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("carry out a visual check on the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("conduct a detailed inspection of altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("conduct a detailed inspection of the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast one's analytical gaze upon altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast one's analytical gaze upon the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast ones analytical gaze upon altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast ones analytical gaze upon the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
  });

  it("should map newly added take verbs to TAKE action", () => {
    expect(mapCommand("bring under one's immediate control katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("bring under one's immediate control the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("bring under ones immediate control katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("bring under ones immediate control the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take into one's direct custody katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take into one's direct custody the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take into ones direct custody katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take into ones direct custody the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("claim ownership of katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("claim ownership of the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
  });

  it("should map newly added drop verbs to DROP action", () => {
    expect(mapCommand("divest oneself of the possession of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("divest oneself of the possession of the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("let fall to the ground boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("let fall to the ground the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("free oneself of the custody of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("free oneself of the custody of the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
  });

  it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
    expect(mapCommand("swing entirely wide open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("swing entirely wide open the vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("latch completely shut door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("latch completely shut the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("seal entirely closed door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("seal entirely closed the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
  });

  it("should map newly added unlock verbs to UNLOCK action", () => {
    expect(mapCommand("deactivate the security locking mechanism on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("deactivate the security locking mechanism on the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("bypass the security locking mechanism of chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("bypass the security locking mechanism of the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("disengage all locking mechanisms on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("disengage all locking mechanisms on the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
  });

  it("should map newly added use verbs to USE action", () => {
    expect(mapCommand("harness the operational functions of lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("harness the operational functions of the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("bring into immediate active service lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("bring into immediate active service the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("make full operational use of lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("make full operational use of the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
  });

  it("should map newly added combat verbs to FIGHT action", () => {
    expect(mapCommand("wage active hostilities against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("wage active hostilities against the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("commence an attack against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("commence an attack against the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("initiate combat operations with ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("initiate combat operations with the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
  });

  it("should map newly added dialogue verbs to TALK action", () => {
    expect(mapCommand("engage in verbal discussion with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("engage in verbal discussion with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("strike up a conversation with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("strike up a conversation with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("initiate verbal communication with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("initiate verbal communication with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
  });
});
