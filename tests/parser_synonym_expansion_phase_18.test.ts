import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion Phase 18 (Task-F55)", () => {
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
    expect(mapCommand("make a run for east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("make a run for the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("take a walk to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("take a walk to the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("press onward to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("press onward to the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
  });

  it("should map newly added inspection verbs to LOOK action", () => {
    expect(mapCommand("run an analysis on altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("run an analysis on the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("do a scan of altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("do a scan of the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast one's eyes on altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast one's eyes on the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast ones eyes on altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast ones eyes on the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
  });

  it("should map newly added take verbs to TAKE action", () => {
    expect(mapCommand("make away with katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("make away with the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("seize possession of katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("seize possession of the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("lay claim on katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("lay claim on the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
  });

  it("should map newly added drop verbs to DROP action", () => {
    expect(mapCommand("fling aside boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("fling aside the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("cast overboard boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("cast overboard the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("disburden one's self of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("disburden one's self of the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("disburden ones self of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("disburden ones self of the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
  });

  it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
    expect(mapCommand("slide wide open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("slide wide open the vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("fasten close door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("fasten close the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("seal tight door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("seal tight the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
  });

  it("should map newly added unlock verbs to UNLOCK action", () => {
    expect(mapCommand("release the locks on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("release the locks on the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("bypass the locks on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("bypass the locks on the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("undo the locks on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("undo the locks on the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
  });

  it("should map newly added use verbs to USE action", () => {
    expect(mapCommand("find a use for lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("find a use for the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("put into action lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("put into action the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("avail one's self of lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("avail one's self of the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("avail ones self of lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("avail ones self of the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
  });

  it("should map newly added combat verbs to FIGHT action", () => {
    expect(mapCommand("launch an assault on ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("launch an assault on the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("carry out an attack on ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("carry out an attack on the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("wage combat against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("wage combat against the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
  });

  it("should map newly added dialogue verbs to TALK action", () => {
    expect(mapCommand("have words with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("have words with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("strike up a discussion with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("strike up a discussion with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("engage in a chat with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("engage in a chat with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
  });
});
