import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion Phase 17 (Task-F54)", () => {
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
    expect(mapCommand("wing one's way to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("wing ones way to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("wing one's way to the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("wing ones way to the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("make tracks for east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("make tracks for the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("hightail it to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("hightail it to the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
  });

  it("should map newly added inspection verbs to LOOK action", () => {
    expect(mapCommand("run a check on altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("run a check on the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast a glance at altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast a glance at the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("pore over altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("pore over the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
  });

  it("should map newly added take verbs to TAKE action", () => {
    expect(mapCommand("walk off with katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("walk off with the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("lay claim to katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("lay claim to the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("bring under one's control katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("bring under one's control the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("bring under ones control katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("bring under ones control the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
  });

  it("should map newly added drop verbs to DROP action", () => {
    expect(mapCommand("wash one's hands of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("wash one's hands of the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("wash ones hands of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("wash ones hands of the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("throw overboard boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("throw overboard the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("set aside boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("set aside the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
  });

  it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
    expect(mapCommand("swing wide open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("swing wide open the vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("draw close door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("draw close the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("fasten tight door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("fasten tight the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
  });

  it("should map newly added unlock verbs to UNLOCK action", () => {
    expect(mapCommand("deactivate security on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("deactivate security on the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("disengage locks on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("disengage locks on the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("pop the locks on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("pop the locks on the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
  });

  it("should map newly added use verbs to USE action", () => {
    expect(mapCommand("bring to bear lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("bring to bear the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("put to use lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("put to use the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
  });

  it("should map newly added combat verbs to FIGHT action", () => {
    expect(mapCommand("engage in battle against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("engage in battle against the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("wage conflict against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("wage conflict against the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("unleash an attack on ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("unleash an attack on the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
  });

  it("should map newly added dialogue verbs to TALK action", () => {
    expect(mapCommand("have a chat with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("have a chat with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("hold conversation with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("hold conversation with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
  });
});
