import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion Phase 15 (Task-F52)", () => {
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
    expect(mapCommand("steer one's course to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("steer ones course to the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("tread one's path to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("tread ones path to the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("navigate one's way to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("navigate ones way to the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
  });

  it("should map newly added inspection verbs to LOOK action", () => {
    expect(mapCommand("run one's eyes over altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("run ones eyes over the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("take a gander at altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("take a gander at the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("examine closely altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("examine closely the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
  });

  it("should map newly added take verbs to TAKE action", () => {
    expect(mapCommand("gain possession of katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("gain possession of the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("get one's hands on katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("get ones hands on the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("lay hands upon katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("lay hands upon the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
  });

  it("should map newly added drop verbs to DROP action", () => {
    expect(mapCommand("dispense with boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("dispense with the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("cast aside boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("cast aside the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("throw aside boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("throw aside the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
  });

  it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
    expect(mapCommand("throw wide open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("throw wide open the vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("throw open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("throw open the vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("pull shut door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("pull shut the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("push shut door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("push shut the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
  });

  it("should map newly added unlock verbs to UNLOCK action", () => {
    expect(mapCommand("pop the lock on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("pop the lock on the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("undo lock on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("undo lock on the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
  });

  it("should map newly added use verbs to USE action", () => {
    expect(mapCommand("bring into play lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("bring into play the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("resort to the use of lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("resort to the use of the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
  });

  it("should map newly added combat verbs to FIGHT action", () => {
    expect(mapCommand("do battle with ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("do battle with the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("wage war against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("wage war against the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("throw down with ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("throw down with the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("trade blows with ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("trade blows with the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
  });

  it("should map newly added dialogue verbs to TALK action", () => {
    expect(mapCommand("enter into conversation with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("enter into conversation with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("strike up conversation with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("strike up conversation with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("engage in talk with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("engage in talk with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
  });
});
