import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion Phase 12 (Task-F49)", () => {
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

  it("should map newly added movement verbs and compound verbs to MOVE action", () => {
    expect(mapCommand("vault to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("skitter to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("scud to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("flit to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("wend one's way to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("vault east", actions).action).toEqual({ type: "MOVE", direction: "east" });
  });

  it("should map newly added inspection verbs to LOOK action", () => {
    expect(mapCommand("contemplate altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("inspect the contents of altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("look through the contents of altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
  });

  it("should map newly added take verbs to TAKE action", () => {
    expect(mapCommand("cart off katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("pluck katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("lay hands on katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
  });

  it("should map newly added drop verbs to DROP action", () => {
    expect(mapCommand("throw down boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("unload boots", actions).action).toEqual({ type: "DROP", item: "boots" });
  });

  it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
    expect(mapCommand("unlatch vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("swing open the vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("block up door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("block up the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
  });

  it("should map newly added unlock verbs to UNLOCK action", () => {
    expect(mapCommand("crack lock on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("disengage lock on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("undo the lock on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
  });

  it("should map newly added use verbs to USE action", () => {
    expect(mapCommand("gulp down lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("don lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("don the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
  });

  it("should map newly added combat verbs to FIGHT action", () => {
    expect(mapCommand("lay into ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("deal blow to ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
  });

  it("should map newly added dialogue verbs to TALK action", () => {
    expect(mapCommand("commune with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("exchange words with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("hold conversation with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
  });
});
