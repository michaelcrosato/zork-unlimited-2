import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion Phase 14 (Task-F51)", () => {
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
    expect(mapCommand("bend one's steps to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("bend ones steps to the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("direct one's steps to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("direct ones steps to the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
  });

  it("should map newly added inspection verbs to LOOK action", () => {
    expect(mapCommand("cast one's gaze upon altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast ones gaze upon altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("direct one's attention to altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("direct ones attention to altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("focus one's eyes on altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("focus ones eyes on the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("fix one's eyes on altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("fix ones eyes on the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
  });

  it("should map newly added take verbs to TAKE action", () => {
    expect(mapCommand("assume custody of katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take custody of katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("lay hold on katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
  });

  it("should map newly added drop verbs to DROP action", () => {
    expect(mapCommand("disburden oneself of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("rid oneself of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("rid ones self of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
  });

  it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
    expect(mapCommand("force wide open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("pry wide open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("prize open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("draw shut door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("push close door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("pull close door", actions).action).toEqual({ type: "CLOSE", target: "door" });
  });

  it("should map newly added unlock verbs to UNLOCK action", () => {
    expect(mapCommand("release lock on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("disengage lock on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
  });

  it("should map newly added use verbs to USE action", () => {
    expect(mapCommand("press into service lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("apply the use of lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
  });

  it("should map newly added combat verbs to FIGHT action", () => {
    expect(mapCommand("engage in combat against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("take up arms against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("cross swords with ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
  });

  it("should map newly added dialogue verbs to TALK action", () => {
    expect(mapCommand("speak in private with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("exchange greetings with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("have discourse with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
  });
});
