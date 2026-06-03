import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion Phase 3 (Task-F38)", () => {
  const actions = [
    { id: "move-east", command: "go east", action: { type: "MOVE" as const, direction: "east" } },
    { id: "look-altar", command: "look altar", action: { type: "LOOK" as const, target: "altar" } },
    { id: "take-katana", command: "take steel katana", action: { type: "TAKE" as const, item: "katana" } },
    { id: "drop-boots", command: "drop leather boots", action: { type: "DROP" as const, item: "boots" } },
    { id: "talk-capo", command: "talk to smuggler capo", action: { type: "TALK" as const, npc: "capo" } },
    { id: "use-lockpick", command: "use lockpick on chest", action: { type: "USE" as const, target: "chest" } },
    { id: "unlock-chest", command: "unlock chest with key", action: { type: "UNLOCK" as const, target: "chest" } },
    { id: "open-vault", command: "open iron vault", action: { type: "OPEN" as const, target: "vault" } },
    { id: "close-door", command: "close heavy door", action: { type: "CLOSE" as const, target: "door" } }
  ];

  it("should map newly added movement verbs and compound verbs to MOVE action", () => {
    expect(mapCommand("venture east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("trek east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("make my way to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("proceed towards east", actions).action).toEqual({ type: "MOVE", direction: "east" });
  });

  it("should map newly added inspection verbs and compound verbs to LOOK action", () => {
    expect(mapCommand("investigate altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("survey altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("analyze altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("take a look at the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast an eye on the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
  });

  it("should map newly added take verbs and compound verbs to TAKE action", () => {
    expect(mapCommand("retrieve katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("snatch katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("grab katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("gather up katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take possession of the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
  });

  it("should map newly added drop verbs and compound verbs to DROP action", () => {
    expect(mapCommand("jettison boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("dump boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("throw away the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("get rid of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
  });

  it("should map newly added crafting/combining verbs and compound verbs to USE action", () => {
    expect(mapCommand("combine lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("forge lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("assemble lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
  });

  it("should map newly added unlocking verbs and compound verbs to UNLOCK action", () => {
    expect(mapCommand("unbolt chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("disengage chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("disengage lock on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
  });

  it("should map newly added opening/unsealing verbs to OPEN action", () => {
    expect(mapCommand("unseal vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("unlatch vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
  });

  it("should map newly added closing verbs and compound verbs to CLOSE action", () => {
    expect(mapCommand("shut door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("seal door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("pull shut door", actions).action).toEqual({ type: "CLOSE", target: "door" });
  });

  it("should map newly added dialog verbs and compound verbs to TALK/ASK action", () => {
    expect(mapCommand("grill capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("have a chat with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("engage in conversation with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
  });
});
