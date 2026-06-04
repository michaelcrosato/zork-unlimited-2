import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion Phase 21 (Task-F58)", () => {
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
    expect(mapCommand("make a dash for east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("make a dash for the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("set out for east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("set out for the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("undertake travel to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("undertake travel to the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
  });

  it("should map newly added inspection verbs to LOOK action", () => {
    expect(mapCommand("run a scan over altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("run a scan over the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("do a walkthrough on altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("do a walkthrough on the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast one's eyes over altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast one's eyes over the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast ones eyes over altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast ones eyes over the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
  });

  it("should map newly added take verbs to TAKE action", () => {
    expect(mapCommand("gain ownership of katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("gain ownership of the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("acquire ownership of katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("acquire ownership of the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("bring into inventory katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("bring into inventory the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
  });

  it("should map newly added drop verbs to DROP action", () => {
    expect(mapCommand("free oneself of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("free oneself of the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("toss to the ground boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("toss to the ground the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("rid ones self of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("rid ones self of the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("rid one's self of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("rid one's self of the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
  });

  it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
    expect(mapCommand("fling completely open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("fling completely open the vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("shut completely door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("shut completely the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("force closed door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("force closed the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
  });

  it("should map newly added unlock verbs to UNLOCK action", () => {
    expect(mapCommand("deactivate the locks on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("deactivate the locks on the chest", actions).action).toEqual({
      type: "UNLOCK",
      target: "chest",
    });
    expect(mapCommand("bypass the lock of chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("bypass the lock of the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("release lock on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("release lock on the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
  });

  it("should map newly added use verbs to USE action", () => {
    expect(mapCommand("press into action lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("press into action the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("harness the power of lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("harness the power of the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("employ the services of lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("employ the services of the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
  });

  it("should map newly added combat verbs to FIGHT action", () => {
    expect(mapCommand("initiate hostilities with ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("initiate hostilities with the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("launch hostilities against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("launch hostilities against the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("start a fight with ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("start a fight with the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
  });

  it("should map newly added dialogue verbs to TALK action", () => {
    expect(mapCommand("strike up dialogue with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("strike up dialogue with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("initiate dialogue with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("initiate dialogue with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("enter conversation with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("enter conversation with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
  });
});
