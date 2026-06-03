import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion Phase 24 (Task-F61)", () => {
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
    expect(mapCommand("direct one's steps towards east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("direct one's steps towards the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("direct ones steps towards east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("direct ones steps towards the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("journey towards the location of east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("journey towards the location of the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("navigate in the direction of east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("navigate in the direction of the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
  });

  it("should map newly added inspection verbs to LOOK action", () => {
    expect(mapCommand("perform a visual inspection of altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("perform a visual inspection of the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast one's critical gaze upon altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast one's critical gaze upon the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast ones critical gaze upon altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast ones critical gaze upon the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("carry out a detailed inspection of altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("carry out a detailed inspection of the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
  });

  it("should map newly added take verbs to TAKE action", () => {
    expect(mapCommand("bring under one's own control katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("bring under one's own control the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("bring under ones own control katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("bring under ones own control the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take into one's own custody katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take into one's own custody the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take into ones own custody katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take into ones own custody the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("secure possession of katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("secure possession of the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
  });

  it("should map newly added drop verbs to DROP action", () => {
    expect(mapCommand("let fall upon the ground boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("let fall upon the ground the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("divest oneself of the custody of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("divest oneself of the custody of the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("free oneself from the possession of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("free oneself from the possession of the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
  });

  it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
    expect(mapCommand("force entirely wide open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("force entirely wide open the vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("force completely shut door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("force completely shut the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("latch completely closed door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("latch completely closed the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
  });

  it("should map newly added unlock verbs to UNLOCK action", () => {
    expect(mapCommand("disengage all the locks on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("disengage all the locks on the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("deactivate the security lock on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("deactivate the security lock on the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("bypass the security locks on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("bypass the security locks on the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
  });

  it("should map newly added use verbs to USE action", () => {
    expect(mapCommand("harness the full power of lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("harness the full power of the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("bring into active service lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("bring into active service the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("make full use of the functions of lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("make full use of the functions of the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
  });

  it("should map newly added combat verbs to FIGHT action", () => {
    expect(mapCommand("wage active warfare against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("wage active warfare against the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("commence an assault against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("commence an assault against the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("initiate combat operations against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("initiate combat operations against the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
  });

  it("should map newly added dialogue verbs to TALK action", () => {
    expect(mapCommand("initiate a conversation with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("initiate a conversation with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("strike up a dialogue with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("strike up a dialogue with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("engage in verbal communication with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("engage in verbal communication with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
  });
});
