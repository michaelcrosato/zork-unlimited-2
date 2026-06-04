import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion Phase 6 (Task-F42)", () => {
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
    expect(mapCommand("migrate to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("wander to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("make one's way to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("wend my way to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("direct oneself to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
  });

  it("should map newly added inspection verbs to LOOK action", () => {
    expect(mapCommand("gawk at altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast eyes on altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("lay eyes on the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("focus on the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("inspect the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("scrutinize the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
  });

  it("should map newly added take verbs to TAKE action", () => {
    expect(mapCommand("appropriate the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("commandeer the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("snatch up the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("scoop up the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("purloin the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
  });

  it("should map newly added drop verbs to DROP action", () => {
    expect(mapCommand("relinquish the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("dispose of the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("throw away the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("jettison the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
  });

  it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
    expect(mapCommand("force open the vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("pry open the vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("slam the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("obstruct the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
  });

  it("should map newly added unlock verbs to UNLOCK action", () => {
    const unlockActions = [
      { id: "unlock-chest", command: "unlock chest with key", action: { type: "UNLOCK" as const, target: "chest" } },
    ];
    expect(mapCommand("pick the lock on chest", unlockActions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("pick lock of the chest", unlockActions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("disengage lock on chest", unlockActions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("unbolt the chest", unlockActions).action).toEqual({ type: "UNLOCK", target: "chest" });
  });

  it("should map newly added use verbs to USE action", () => {
    expect(mapCommand("utilize the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("interact with the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("put to use the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("make use of the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
  });

  it("should map newly added combat verbs to FIGHT action", () => {
    expect(mapCommand("assail the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("wage war on the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("annihilate the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("obliterate the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
  });

  it("should map newly added dialogue verbs to TALK action", () => {
    expect(mapCommand("parley with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("have a conversation with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("confer with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("seek advice from the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
  });
});
