import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion Phase 4 (Task-F39)", () => {
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
    expect(mapCommand("scurry east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("scurry to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("make haste to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
  });

  it("should map newly added inspection verbs to LOOK action", () => {
    expect(mapCommand("grok altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("scrutinize altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("peruse altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
  });

  it("should map newly added combat verbs and compound verbs to FIGHT action", () => {
    expect(mapCommand("obliterate ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("eliminate ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("exterminate ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("eradicate ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("neutralize ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("neutralize the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("obliterate the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
  });

  it("should map newly added dialogue verbs and compound verbs to TALK action", () => {
    expect(mapCommand("confer with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("seek advice from capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("have a conversation with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
  });

  it("should map newly added trading verbs and compound verbs to BUY and SELL actions", () => {
    expect(mapCommand("procure travelbread from merchant", actions).action).toEqual({ type: "BUY", item: "travelbread" });
    expect(mapCommand("procure travelbread from the merchant", actions).action).toEqual({ type: "BUY", item: "travelbread" });
  });

  it("should map newly added use verbs and compound verbs to USE action", () => {
    expect(mapCommand("deploy lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("activate lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
  });
});
