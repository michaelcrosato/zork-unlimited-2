import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion Phase 31 (Task-F68)", () => {
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
    expect(mapCommand("navigate one's course in the direction of east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("navigate one's course in the direction of the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("navigate ones course in the direction of east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("navigate ones course in the direction of the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    
    expect(mapCommand("steer one's course towards the location of east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("steer one's course towards the location of the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("steer ones course towards the location of east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("steer ones course towards the location of the east", actions).action).toEqual({ type: "MOVE", direction: "east" });

    expect(mapCommand("direct one's steps towards the coordinates of east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("direct one's steps towards the coordinates of the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("direct ones steps towards the coordinates of east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("direct ones steps towards the coordinates of the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
  });

  it("should map newly added inspection verbs to LOOK action", () => {
    expect(mapCommand("conduct a thorough visual inspection on altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("conduct a thorough visual inspection on the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    
    expect(mapCommand("carry out a detailed visual check on altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("carry out a detailed visual check on the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    
    expect(mapCommand("cast one's analytical eyes upon altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast one's analytical eyes upon the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast ones analytical eyes upon altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast ones analytical eyes upon the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
  });

  it("should map newly added take verbs to TAKE action", () => {
    expect(mapCommand("bring under one's absolute ownership katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("bring under one's absolute ownership the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("bring under ones absolute ownership katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("bring under ones absolute ownership the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    
    expect(mapCommand("take into one's absolute possession katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take into one's absolute possession the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take into ones absolute possession katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take into ones absolute possession the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });

    expect(mapCommand("assume physical custody of katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("assume physical custody of the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
  });

  it("should map newly added drop verbs to DROP action", () => {
    expect(mapCommand("divest oneself of the absolute custody of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("divest oneself of the absolute custody of the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    
    expect(mapCommand("let drop directly onto the ground surface boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("let drop directly onto the ground surface the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    
    expect(mapCommand("free oneself from the absolute possession of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("free oneself from the absolute possession of the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
  });

  it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
    expect(mapCommand("swing entirely wide open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("swing entirely wide open the vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("pry fully and completely open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("pry fully and completely open the vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    
    expect(mapCommand("latch entirely shut and secure door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("latch entirely shut and secure the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("seal entirely shut and secure door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("seal entirely shut and secure the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
  });

  it("should map newly added unlock verbs to UNLOCK action", () => {
    expect(mapCommand("deactivate all mechanical locking mechanisms on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("deactivate all mechanical locking mechanisms on the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("bypass all mechanical locking mechanisms of chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("bypass all mechanical locking mechanisms of the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("disengage the primary locking mechanism on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("disengage the primary locking mechanism on the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
  });

  it("should map newly added use verbs to USE action", () => {
    expect(mapCommand("harness the operational capability of lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("harness the operational capability of the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    
    expect(mapCommand("bring into immediate active utilization lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("bring into immediate active utilization the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    
    expect(mapCommand("make complete operational utilization of lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("make complete operational utilization of the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
  });

  it("should map newly added combat verbs to FIGHT action", () => {
    expect(mapCommand("wage active physical combat against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("wage active physical combat against the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    
    expect(mapCommand("commence direct physical combat against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("commence direct physical combat against the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    
    expect(mapCommand("initiate offensive combat operations against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("initiate offensive combat operations against the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
  });

  it("should map newly added dialogue verbs to TALK action", () => {
    expect(mapCommand("initiate a direct verbal discussion with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("initiate a direct verbal discussion with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    
    expect(mapCommand("engage in a direct verbal conversation with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("engage in a direct verbal conversation with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    
    expect(mapCommand("strike up a direct verbal discussion with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("strike up a direct verbal discussion with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
  });
});
