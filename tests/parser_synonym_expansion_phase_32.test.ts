import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion Phase 32 (Task-F69)", () => {
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
    
    expect(mapCommand("navigate one's journey towards the location of east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("navigate one's journey towards the location of the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("navigate ones journey towards the location of east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("navigate ones journey towards the location of the east", actions).action).toEqual({ type: "MOVE", direction: "east" });

    expect(mapCommand("direct one's steps in the direction of the coordinates of east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("direct one's steps in the direction of the coordinates of the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("direct ones steps in the direction of the coordinates of east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("direct ones steps in the direction of the coordinates of the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
  });

  it("should map newly added inspection verbs to LOOK action", () => {
    expect(mapCommand("conduct a detailed visual inspection on altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("conduct a detailed visual inspection on the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    
    expect(mapCommand("carry out a thorough visual check on altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("carry out a thorough visual check on the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    
    expect(mapCommand("cast one's analytical gaze upon altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast one's analytical gaze upon the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast ones analytical gaze upon altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast ones analytical gaze upon the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
  });

  it("should map newly added take verbs to TAKE action", () => {
    expect(mapCommand("bring under one's absolute possession katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("bring under one's absolute possession the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("bring under ones absolute possession katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("bring under ones absolute possession the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    
    expect(mapCommand("take into one's immediate control katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take into one's immediate control the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take into ones immediate control katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take into ones immediate control the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });

    expect(mapCommand("assume direct physical custody of katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("assume direct physical custody of the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
  });

  it("should map newly added drop verbs to DROP action", () => {
    expect(mapCommand("divest oneself of the absolute possession of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("divest oneself of the absolute possession of the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    
    expect(mapCommand("let drop directly onto the floor surface boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("let drop directly onto the floor surface the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    
    expect(mapCommand("free oneself from the immediate custody of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("free oneself from the immediate custody of the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
  });

  it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
    expect(mapCommand("swing entirely and completely open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("swing entirely and completely open the vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("pry fully and wide open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("pry fully and wide open the vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    
    expect(mapCommand("latch entirely and securely shut door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("latch entirely and securely shut the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("seal entirely and securely shut door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("seal entirely and securely shut the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
  });

  it("should map newly added unlock verbs to UNLOCK action", () => {
    expect(mapCommand("deactivate all mechanical lock systems on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("deactivate all mechanical lock systems on the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("bypass all mechanical lock systems of chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("bypass all mechanical lock systems of the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("disengage the primary security locking mechanism on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("disengage the primary security locking mechanism on the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
  });

  it("should map newly added use verbs to USE action", () => {
    expect(mapCommand("harness the full operational capability of lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("harness the full operational capability of the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    
    expect(mapCommand("bring into active mechanical service lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("bring into active mechanical service the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    
    expect(mapCommand("make complete active utilization of lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("make complete active utilization of the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
  });

  it("should map newly added combat verbs to FIGHT action", () => {
    expect(mapCommand("wage direct physical hostilities against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("wage direct physical hostilities against the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    
    expect(mapCommand("commence active combat operations with ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("commence active combat operations with the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    
    expect(mapCommand("initiate offensive physical hostilities against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("initiate offensive physical hostilities against the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
  });

  it("should map newly added dialogue verbs to TALK action", () => {
    expect(mapCommand("initiate a direct verbal dialogue with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("initiate a direct verbal dialogue with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    
    expect(mapCommand("engage in a direct verbal discussion with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("engage in a direct verbal discussion with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    
    expect(mapCommand("strike up a direct verbal conversation with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("strike up a direct verbal conversation with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
  });
});
