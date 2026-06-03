import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion Phase 5 (Task-F40)", () => {
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
    { id: "buy-bread", command: "buy travelbread from merchant", action: { type: "BUY" as const, item: "travelbread" } },
    { id: "sell-bread", command: "sell travelbread to merchant", action: { type: "SELL" as const, item: "travelbread" } }
  ];

  it("should map newly added movement verbs and compound verbs to MOVE action", () => {
    expect(mapCommand("plod east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("saunter east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("trudge to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("hike to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
  });

  it("should map newly added inspection verbs to LOOK action", () => {
    expect(mapCommand("peer at altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("eyeball altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("gaze at altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("take a gander at altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
  });

  it("should map newly added take verbs and compound verbs to TAKE action", () => {
    expect(mapCommand("pocket katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("pilfer katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("swipe the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("lay hands on katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
  });

  it("should map newly added drop verbs and compound verbs to DROP action", () => {
    expect(mapCommand("discard boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("abandon boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("cast off boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("lay down boots", actions).action).toEqual({ type: "DROP", item: "boots" });
  });

  it("should map newly added combat verbs and compound verbs to FIGHT action", () => {
    expect(mapCommand("annihilate ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("vanquish ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("subdue ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("pummel ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("slay the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("wage war on ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("strike down ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("lay waste to ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
  });

  it("should map newly added dialogue verbs and compound verbs to TALK action", () => {
    expect(mapCommand("parley with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("chitchat with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("have chitchat with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("have a parley with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
  });

  it("should map newly added trading verbs and compound verbs to BUY and SELL actions", () => {
    expect(mapCommand("acquire travelbread from merchant", actions).action).toEqual({ type: "BUY", item: "travelbread" });
    expect(mapCommand("vend travelbread to merchant", actions).action).toEqual({ type: "SELL", item: "travelbread" });
  });

  it("should map newly added use verbs and compound verbs to USE action", () => {
    expect(mapCommand("harness lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("exploit lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("employ lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("apply lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("put to use lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("make use of lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
  });
});
