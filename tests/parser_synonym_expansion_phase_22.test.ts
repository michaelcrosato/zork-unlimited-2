import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion Phase 22 (Task-F59)", () => {
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
    expect(mapCommand("undertake a journey towards east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("undertake a journey towards the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("undertake travel towards east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("undertake travel towards the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("steer one's steps towards east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("steer one's steps towards the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("steer ones steps towards east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("steer ones steps towards the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
  });

  it("should map newly added inspection verbs to LOOK action", () => {
    expect(mapCommand("perform an analysis on altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("perform an analysis on the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("conduct an analysis on altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("conduct an analysis on the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("run a diagnostic on altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("run a diagnostic on the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
  });

  it("should map newly added take verbs to TAKE action", () => {
    expect(mapCommand("assume control over katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("assume control over the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("gather into inventory katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("gather into inventory the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take into possession katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take into possession the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
  });

  it("should map newly added drop verbs to DROP action", () => {
    expect(mapCommand("cast to the earth boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("cast to the earth the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("toss onto the ground boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("toss onto the ground the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("free ones self of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("free ones self of the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
  });

  it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
    expect(mapCommand("force completely open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("force completely open the vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("shut entirely door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("shut entirely the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("seal completely door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("seal completely the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
  });

  it("should map newly added unlock verbs to UNLOCK action", () => {
    expect(mapCommand("deactivate the locking system on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("deactivate the locking system on the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("bypass the locking system of chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("bypass the locking system of the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("disable the locking system on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("disable the locking system on the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
  });

  it("should map newly added use verbs to USE action", () => {
    expect(mapCommand("utilize the functions of lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("utilize the functions of the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("employ the functions of lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("employ the functions of the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("put to service lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("put to service the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
  });

  it("should map newly added combat verbs to FIGHT action", () => {
    expect(mapCommand("launch an assault against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("launch an assault against the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("initiate hostilities against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("initiate hostilities against the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("enter combat with ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("enter combat with the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
  });

  it("should map newly added dialogue verbs to TALK action", () => {
    expect(mapCommand("engage in discussion with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("engage in discussion with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("initiate a discussion with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("initiate a discussion with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("strike up talk with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("strike up talk with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
  });
});
